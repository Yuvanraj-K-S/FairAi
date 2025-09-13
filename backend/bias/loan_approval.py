#!/usr/bin/env python3
"""
ML Model Fairness Evaluation System - Improved / Fixed Version

Usage:
    python ml_fairness_evaluator.py --model model.pkl --data test.csv --config params.json

API Usage:
    POST /api/loan/evaluate with multipart/form-data:
      - model_file: model file (.pkl/.joblib/.onnx/.pt/.pth/.h5)
      - test_csv: CSV file
      - params_json: JSON string with {"features": [...], "label": "...", "sensitive_attribute": "...", ...}

Security note:
    Loading arbitrary pickles or model files is risky. By default this script will refuse
    to load plain pickles unless the environment variable ALLOW_UNTRUSTED_MODELS is set to "1".
    For production, run model loading inside a sandboxed worker/container and prefer ONNX or
    scripted/traced PyTorch models.
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import argparse
import warnings
from datetime import datetime
import logging
import zipfile
import tempfile
from io import BytesIO

# Use Agg for headless servers
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Optional deps flags (set to True only if import succeeds)
SKLEARN_AVAILABLE = False
JOBLIB_AVAILABLE = False
PICKLE_AVAILABLE = True  # builtin
ONNX_AVAILABLE = False
TORCH_AVAILABLE = False
TF_AVAILABLE = False
MATPLOTLIB_AVAILABLE = True  # we imported matplotlib above

try:
    import joblib
    JOBLIB_AVAILABLE = True
except Exception:
    logger.info("joblib not available; will fallback to pickle for .pkl files when allowed")

try:
    # try to import sklearn metrics we need
    from sklearn.metrics import (
        confusion_matrix, roc_auc_score, roc_curve, accuracy_score
    )
    SKLEARN_AVAILABLE = True
except Exception:
    logger.info("scikit-learn not fully available; metrics will fallback to simpler implementations where possible")

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except Exception:
    logger.info("onnxruntime not available; ONNX models not supported")

try:
    import torch
    TORCH_AVAILABLE = True
except Exception:
    logger.info("PyTorch not available; .pt/.pth models not supported")

try:
    import tensorflow as tf
    TF_AVAILABLE = True
except Exception:
    logger.info("TensorFlow not available; .h5 models not supported")

# Custom exceptions
class ValidationError(Exception):
    pass

class ModelLoadingError(Exception):
    pass

# -----------------------
# Upload and Schema utils
# -----------------------
class UploadHandler:
    """Validates file extensions and sizes. Warns about untrusted formats."""
    ALLOWED_MODEL_EXTENSIONS = {'.pt', '.pth', '.onnx', '.h5', '.pkl', '.joblib'}
    ALLOWED_DATA_EXTENSIONS = {'.csv'}
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

    @staticmethod
    def validate_file(file_path: str, allowed_extensions: set) -> bool:
        path = Path(file_path)
        if path.suffix.lower() not in allowed_extensions:
            raise ValidationError(f"Invalid file extension for {path.name}. Allowed: {allowed_extensions}")
        if path.exists() and path.stat().st_size > UploadHandler.MAX_FILE_SIZE:
            raise ValidationError(f"File {path.name} too large. Max size: {UploadHandler.MAX_FILE_SIZE / (1024*1024):.0f} MB")
        return True

    @staticmethod
    def validate_model_file(file_path: str) -> str:
        UploadHandler.validate_file(file_path, UploadHandler.ALLOWED_MODEL_EXTENSIONS)
        ext = Path(file_path).suffix.lower()
        if ext in ['.pkl', '.joblib']:
            return 'sklearn'
        elif ext == '.onnx':
            if not ONNX_AVAILABLE:
                raise ValidationError("ONNX model uploaded but onnxruntime is not installed on the server.")
            return 'onnx'
        elif ext in ['.pt', '.pth']:
            if not TORCH_AVAILABLE:
                raise ValidationError("PyTorch model uploaded but PyTorch is not installed on the server.")
            return 'pytorch'
        elif ext == '.h5':
            if not TF_AVAILABLE:
                raise ValidationError("TensorFlow model uploaded but tensorflow is not installed on the server.")
            return 'tensorflow'
        else:
            raise ValidationError(f"Unsupported model format: {ext}")

class SchemaValidator:
    """Validates parameters and CSV schema"""
    @staticmethod
    def validate_params(params: Dict[str, Any]) -> Dict[str, Any]:
        required_fields = ['features', 'label', 'sensitive_attribute']
        for f in required_fields:
            if f not in params:
                raise ValidationError(f"Missing required parameter: {f}")
        if not isinstance(params['features'], list) or len(params['features']) == 0:
            raise ValidationError("'features' must be a non-empty list")
        if not isinstance(params['label'], str):
            raise ValidationError("'label' must be a string")
        if not isinstance(params['sensitive_attribute'], str):
            raise ValidationError("'sensitive_attribute' must be a string")
        params.setdefault('positive_label', 1)
        params.setdefault('id_column', None)
        params.setdefault('bucket_definitions', None)  # optional for continuous sensitive attr
        return params

    @staticmethod
    def validate_csv(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
        required_columns = params['features'] + [params['label'], params['sensitive_attribute']]
        if params.get('id_column'):
            required_columns.append(params['id_column'])
        missing = [c for c in required_columns if c not in df.columns]
        if missing:
            raise ValidationError(f"Missing columns in CSV: {missing}")
        if df.empty:
            raise ValidationError("CSV is empty")
        # Report nulls
        null_counts = df[required_columns].isnull().sum()
        if null_counts.sum() > 0:
            logger.warning(f"Null values present: {null_counts[null_counts>0].to_dict()}")
        return df

# -----------------------
# Model wrapper
# -----------------------
class ModelWrapper:
    """
    Universal wrapper for sklearn/ONNX/PyTorch/TensorFlow models.
    Note: For security, loading pickled sklearn objects is gated by env var.
    """
    def __init__(self, model_path: str, model_type: str, features: List[str]):
        self.model_path = model_path
        self.model_type = model_type
        self.features = features
        self.model = None
        self._load_model()

    def _load_model(self):
        ext = Path(self.model_path).suffix.lower()
        allow_untrusted = os.environ.get('ALLOW_UNTRUSTED_MODELS', '0') == '1'

        try:
            if self.model_type == "sklearn":
                # prefer joblib, fallback to pickle only if explicitly allowed
                if JOBLIB_AVAILABLE:
                    try:
                        self.model = joblib.load(self.model_path)
                        logger.info("Loaded sklearn model via joblib")
                        return
                    except Exception as e:
                        logger.warning(f"joblib.load failed: {e}; will attempt pickle if allowed")

                if not allow_untrusted:
                    raise ModelLoadingError(
                        "Loading plain pickles is disabled for security. Set ALLOW_UNTRUSTED_MODELS=1 to enable (not recommended for production)."
                    )
                # fallback to pickle
                import pickle
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("Loaded sklearn model via pickle (UNTRUSTED)")

            elif self.model_type == "onnx":
                if not ONNX_AVAILABLE:
                    raise ModelLoadingError("onnxruntime not available")
                self.model = ort.InferenceSession(self.model_path)
                logger.info("ONNX model loaded")

            elif self.model_type == "pytorch":
                if not TORCH_AVAILABLE:
                    raise ModelLoadingError("PyTorch not available")
                # Prefer scripted/traced models (torch.jit)
                try:
                    self.model = torch.jit.load(self.model_path, map_location='cpu')
                    logger.info("Loaded scripted/traced PyTorch model (torch.jit.load)")
                except Exception:
                    # fallback to torch.load, but ensure it's not a bare state_dict
                    loaded = torch.load(self.model_path, map_location='cpu')
                    if isinstance(loaded, dict):
                        raise ModelLoadingError(
                            "PyTorch file appears to be a state_dict. Upload a scripted/traced model "
                            "or provide code to construct model class + state_dict. For demos, prefer a scripted model."
                        )
                    self.model = loaded
                    logger.info("Loaded PyTorch model object (torch.load)")
                if hasattr(self.model, 'eval'):
                    self.model.eval()

            elif self.model_type == "tensorflow":
                if not TF_AVAILABLE:
                    raise ModelLoadingError("TensorFlow not available")
                self.model = tf.keras.models.load_model(self.model_path)
                logger.info("Loaded TensorFlow Keras model")

            else:
                raise ModelLoadingError(f"Unsupported model type: {self.model_type}")

        except Exception as e:
            raise ModelLoadingError(f"Failed to load model: {e}")

    def _select_and_cast(self, df: pd.DataFrame) -> pd.DataFrame:
        if not all(col in df.columns for col in self.features):
            missing = [c for c in self.features if c not in df.columns]
            raise ValidationError(f"Missing feature columns: {missing}")

        X = df[self.features].copy()

        # Basic numeric coercion for object columns
        for col in X.columns:
            if X[col].dtype == 'object':
                # try numeric conversion, otherwise leave as-is (model may expect preprocessed input)
                X[col] = pd.to_numeric(X[col], errors='coerce')

        # Simple imputation for numeric columns
        if X.isnull().sum().sum() > 0:
            num_cols = X.select_dtypes(include=[np.number]).columns
            if len(num_cols) > 0:
                X[num_cols] = X[num_cols].fillna(X[num_cols].mean())
            # For non-numeric nulls, leave as NaN - model may or may not accept them
        return X

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """Get probability predictions from various model types.
        
        Handles:
        - Standard scikit-learn models (with predict_proba or predict)
        - Custom models with callable predict methods
        - Dictionary-wrapped models
        - Models with different output formats
        - ONNX models
        - PyTorch models
        - TensorFlow models
        """
        X = self._select_and_cast(df)
        
        try:
            model = self.model
            
            # Handle dictionary-wrapped models (common in some save formats)
            if isinstance(model, dict):
                if 'model' in model:
                    model = model['model']
                else:
                    # Try to find a model-like object in the dictionary
                    for value in model.values():
                        if hasattr(value, 'predict') or hasattr(value, 'predict_proba'):
                            model = value
                            break
            
            # Handle ONNX models
            if self.model_type == "onnx":
                input_name = self.model.get_inputs()[0].name
                arr = X.astype(np.float32).to_numpy()
                outputs = self.model.run(None, {input_name: arr})
                out = outputs[0]
                out = np.asarray(out)
                if out.ndim == 1:
                    return out
                if out.shape[1] >= 2:
                    return out[:, 1]
                return out[:, -1]
            
            # Handle PyTorch models
            elif self.model_type == "pytorch":
                if not TORCH_AVAILABLE:
                    raise ModelLoadingError("PyTorch not available")
                with torch.no_grad():
                    arr = torch.tensor(X.to_numpy(), dtype=torch.float32)
                    out = self.model(arr)
                    out_np = out.detach().cpu().numpy()
                    if out_np.ndim == 1:
                        return out_np
                    if out_np.shape[1] == 1:
                        # logits or probabilities single-output
                        try:
                            probs = 1 / (1 + np.exp(-out_np.ravel()))
                        except:
                            probs = out_np.ravel()
                        return probs
                    else:
                        # multi-class -> take probability of class 1
                        return out_np[:, 1]
            
            # Handle TensorFlow models
            elif self.model_type == "tensorflow":
                out = self.model.predict(X.to_numpy(), verbose=0)
                out = np.asarray(out)
                if out.ndim == 1 or out.shape[1] == 1:
                    return out.ravel()
                return out[:, 1]
            
            # Handle scikit-learn compatible models
            elif hasattr(model, 'predict_proba'):
                # Standard scikit-learn predict_proba
                probs = model.predict_proba(X)
                if probs.ndim == 1:
                    return probs  # Already 1D array of probabilities
                if probs.shape[1] >= 2:
                    return probs[:, 1]  # Return probabilities of positive class
                return probs  # Fallback for other cases
                
            elif hasattr(model, 'predict'):
                # For models with only predict method (e.g., some regressors)
                predictions = model.predict(X)
                # If predictions are already probabilities (0-1)
                if np.all((predictions >= 0) & (predictions <= 1)):
                    return predictions
                # Otherwise, treat as binary predictions and convert to probabilities
                return (predictions > 0.5).astype(float)
                
            elif callable(model):
                # Handle callable models (e.g., functions)
                predictions = model(X)
                if isinstance(predictions, (pd.Series, pd.DataFrame)):
                    predictions = predictions.values
                return np.asarray(predictions).flatten()
                
            else:
                raise ModelLoadingError(
                    "Model does not implement predict_proba() or predict() methods "
                    f"and is not callable. Model type: {type(model).__name__}"
                )

        except Exception as e:
            logger.exception("Prediction failed")
            # Fail fast: Surface the error to the caller instead of returning random values.
            raise ModelLoadingError(f"Prediction failed: {e}")

    def predict(self, df: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        probs = self.predict_proba(df)
        # If probs are 0/1 already, ensure threshold works
        probs = np.asarray(probs)
        # if probs are integers 0/1, threshold works naturally
        return (probs >= threshold).astype(int)

# -----------------------
# Metrics Engine
# -----------------------
def bootstrap_ci(data: np.ndarray, stat_fn, n_bootstrap: int = 1000, alpha: float = 0.05) -> Tuple[float, float]:
    """Compute bootstrap percentile CI for a statistic on a 1D array."""
    if len(data) == 0:
        return (np.nan, np.nan)
    stats = []
    n = len(data)
    for _ in range(n_bootstrap):
        sample = np.random.choice(data, size=n, replace=True)
        stats.append(stat_fn(sample))
    lower = np.percentile(stats, 100 * (alpha / 2))
    upper = np.percentile(stats, 100 * (1 - alpha / 2))
    return float(lower), float(upper)

class MetricsEngine:
    def __init__(self, threshold: float = 0.5, bootstrap_ci_enabled: bool = True):
        self.threshold = float(threshold)
        self.bootstrap_ci_enabled = bootstrap_ci_enabled

    def compute_group_metrics(self, df: pd.DataFrame, pred_col: str, label_col: str,
                              group_col: str, prob_col: str, pos_label: Any = 1) -> Dict[str, Dict[str, Any]]:
        results = {}
        for group, sub in df.groupby(group_col):
            y_true = (sub[label_col] == pos_label).astype(int).to_numpy()
            y_prob = sub[prob_col].to_numpy()
            y_pred = (sub[pred_col].to_numpy() >= self.threshold).astype(int)

            tp = int(((y_pred == 1) & (y_true == 1)).sum())
            fp = int(((y_pred == 1) & (y_true == 0)).sum())
            tn = int(((y_pred == 0) & (y_true == 0)).sum())
            fn = int(((y_pred == 0) & (y_true == 1)).sum())

            total = len(sub)
            approval_rate = float(y_pred.mean()) if total > 0 else float('nan')
            accuracy = float((y_pred == y_true).mean()) if total > 0 else float('nan')

            tpr = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
            fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
            tnr = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
            fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

            precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
            recall = tpr
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            # AUC if possible
            try:
                auc = float(roc_auc_score(y_true, y_prob)) if SKLEARN_AVAILABLE and len(np.unique(y_true)) > 1 else None
            except Exception:
                auc = None

            # Bootstrap CI for approval rate if enabled
            approval_ci = (None, None)
            if self.bootstrap_ci_enabled and total > 0:
                try:
                    approval_ci = bootstrap_ci(y_pred, np.mean, n_bootstrap=200)
                except Exception:
                    approval_ci = (None, None)

            results[str(group)] = {
                'count': int(total),
                'approval_rate': approval_rate,
                'approval_rate_ci': approval_ci,
                'accuracy': accuracy,
                'tpr': tpr,
                'fpr': fpr,
                'tnr': tnr,
                'fnr': fnr,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'auc': auc
            }
        return results

    def compute_fairness_metrics(self, group_metrics: Dict[str, Dict[str, Any]]) -> Dict[str, float]:
        if len(group_metrics) < 2:
            return {}
        groups = list(group_metrics.keys())
        approval_rates = [group_metrics[g]['approval_rate'] for g in groups]
        tprs = [group_metrics[g]['tpr'] for g in groups]
        fprs = [group_metrics[g]['fpr'] for g in groups]

        dp_diff = max(approval_rates) - min(approval_rates)
        dp_ratio = (min(approval_rates) / max(approval_rates)) if max(approval_rates) > 0 else 0.0
        eo_diff = max(tprs) - min(tprs)
        tpr_diff = max(tprs) - min(tprs)
        fpr_diff = max(fprs) - min(fprs)
        eq_odds_diff = max(tpr_diff, fpr_diff)

        return {
            'demographic_parity_difference': float(dp_diff),
            'demographic_parity_ratio': float(dp_ratio),
            'equal_opportunity_difference': float(eo_diff),
            'equalized_odds_difference': float(eq_odds_diff),
            'disparate_impact': float(dp_ratio)
        }

    def identify_flags(self, fairness_metrics: Dict[str, float]) -> List[str]:
        flags = []
        if fairness_metrics.get('disparate_impact', 1.0) < 0.8:
            flags.append(f"Disparate impact ratio = {fairness_metrics['disparate_impact']:.3f} < 0.8")
        if fairness_metrics.get('demographic_parity_difference', 0.0) > 0.10:
            flags.append(f"Demographic parity difference = {fairness_metrics['demographic_parity_difference']:.3f} > 0.10")
        if fairness_metrics.get('equal_opportunity_difference', 0.0) > 0.10:
            flags.append(f"Equal opportunity difference = {fairness_metrics['equal_opportunity_difference']:.3f} > 0.10")
        if fairness_metrics.get('equalized_odds_difference', 0.0) > 0.10:
            flags.append(f"Equalized odds difference = {fairness_metrics['equalized_odds_difference']:.3f} > 0.10")
        return flags

# -----------------------
# Visualizations
# -----------------------
class VisualizationGenerator:
    @staticmethod
    def create_approval_rate_chart(group_metrics: Dict[str, Dict[str, Any]], output_dir: str = 'plots'):
        os.makedirs(output_dir, exist_ok=True)
        groups = list(group_metrics.keys())
        approval_rates = [group_metrics[g]['approval_rate'] for g in groups]
        plt.figure(figsize=(8, 5))
        bars = plt.bar(groups, approval_rates, alpha=0.7)
        plt.title('Approval Rate by Group')
        plt.ylabel('Approval Rate')
        plt.xlabel('Group')
        for bar, rate in zip(bars, approval_rates):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01, f"{rate:.3f}", ha='center')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'approval_rate_by_group.png'), dpi=200)
        plt.close()

    @staticmethod
    def create_performance_metrics_chart(group_metrics: Dict[str, Dict[str, Any]], output_dir: str = 'plots'):
        os.makedirs(output_dir, exist_ok=True)
        groups = list(group_metrics.keys())
        metrics = ['tpr', 'fpr', 'precision', 'f1_score']
        fig, axes = plt.subplots(2, 2, figsize=(12, 8))
        axes = axes.ravel()
        for i, metric in enumerate(metrics):
            values = [group_metrics[g][metric] for g in groups]
            bars = axes[i].bar(groups, values, alpha=0.7)
            axes[i].set_title(metric.upper())
            for bar, v in zip(bars, values):
                axes[i].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01, f"{v:.3f}", ha='center')
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'performance_metrics_by_group.png'), dpi=200)
        plt.close()

    @staticmethod
    def create_roc_curves(df: pd.DataFrame, label_col: str, prob_col: str, group_col: str, pos_label: Any = 1, output_dir: str = 'plots'):
        os.makedirs(output_dir, exist_ok=True)
        plt.figure(figsize=(8, 8))
        plotted = False
        for group, sub in df.groupby(group_col):
            y_true = (sub[label_col] == pos_label).astype(int)
            y_prob = sub[prob_col]
            if len(np.unique(y_true)) > 1:
                try:
                    fpr, tpr, _ = roc_curve(y_true, y_prob)
                    auc_score = roc_auc_score(y_true, y_prob) if SKLEARN_AVAILABLE else None
                    plt.plot(fpr, tpr, label=f"{group} (AUC={auc_score:.3f})" if auc_score is not None else f"{group}")
                    plotted = True
                except Exception:
                    continue
        if not plotted:
            plt.text(0.5, 0.5, "ROC curves not available (single-class groups or no probabilities)", ha='center')
        else:
            plt.plot([0, 1], [0, 1], 'k--')
            plt.xlabel('FPR')
            plt.ylabel('TPR')
            plt.title('ROC by Group')
            plt.legend()
            plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'roc_curves_by_group.png'), dpi=200)
        plt.close()

# -----------------------
# Mitigation advisor & reports
# -----------------------
class MitigationAdvisor:
    @staticmethod
    def generate_recommendations(group_metrics, fairness_metrics, flags):
        recommendations = []
        if not flags:
            recommendations.append("No significant fairness issues detected. Continue monitoring.")
            return recommendations
        if fairness_metrics.get('disparate_impact', 1.0) < 0.8:
            recommendations += [
                "DISPARATE IMPACT: consider reweighting examples, threshold adjustment, or fairness-aware retraining",
                "Check for proxy features (ZIP code, etc.) and consider removing or transforming them"
            ]
        if fairness_metrics.get('equal_opportunity_difference', 0.0) > 0.1:
            recommendations += [
                "EQUAL OPPORTUNITY GAP: consider per-group threshold calibration, collecting more data for underperforming groups"
            ]
        recommendations += [
            "",
            "GENERAL: implement monitoring, document choices, and consider human-in-the-loop for ambiguous cases"
        ]
        return recommendations

class ReportGenerator:
    def __init__(self, output_dir: str = 'fairness_results'):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_predictions_csv(self, df: pd.DataFrame, pred_col: str, prob_col: str, group_col: str, id_col: Optional[str] = None) -> str:
        out = df.copy()
        columns = []
        if id_col and id_col in out.columns:
            columns.append(id_col)
        columns += [group_col, pred_col, prob_col]
        out = out[columns]
        path = os.path.join(self.output_dir, 'predictions_with_group.csv')
        out.to_csv(path, index=False)
        return path

    def generate_group_metrics_csv(self, group_metrics: Dict[str, Dict[str, Any]]) -> str:
        df = pd.DataFrame(group_metrics).T
        path = os.path.join(self.output_dir, 'group_metrics.csv')
        df.to_csv(path, index_label='group')
        return path

    def generate_summary_json(self, overall_metrics: Dict[str, Any], group_metrics: Dict[str, Any], fairness_metrics: Dict[str, float], flags: List[str]) -> str:
        summary = {
            'timestamp': datetime.now().isoformat(),
            'overall': overall_metrics,
            'group_summary': group_metrics,
            'fairness_metrics': fairness_metrics,
            'flags': flags,
            'assessment': 'FAIL' if flags else 'PASS'
        }
        path = os.path.join(self.output_dir, 'summary.json')
        with open(path, 'w') as f:
            json.dump(summary, f, indent=2)
        return path

    def generate_recommendations_txt(self, recommendations: List[str]) -> str:
        path = os.path.join(self.output_dir, 'recommendations.txt')
        with open(path, 'w') as f:
            f.write("RECOMMENDATIONS\n")
            f.write("="*80 + "\n\n")
            f.write("\n".join(recommendations))
        return path

    def create_report_zip(self) -> str:
        zip_path = os.path.join(os.path.dirname(self.output_dir), Path(self.output_dir).name + '.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(self.output_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, self.output_dir)
                    zf.write(file_path, arcname)
        return zip_path

# -----------------------
# Orchestration
# -----------------------
class MLFairnessEvaluator:
    def __init__(self, model_path: str, data_path: str, params: Dict[str, Any],
                 threshold: float = 0.5, output_dir: str = 'fairness_results'):
        self.model_path = model_path
        self.data_path = data_path
        self.params = params
        self.threshold = float(threshold)
        self.output_dir = output_dir

        self.upload_handler = UploadHandler()
        self.schema_validator = SchemaValidator()
        self.metrics_engine = MetricsEngine(self.threshold)
        self.viz_generator = VisualizationGenerator()
        self.mitigation_advisor = MitigationAdvisor()
        self.report_generator = ReportGenerator(self.output_dir)

    def validate_inputs(self) -> str:
        logger.info("Validating inputs")
        model_type = self.upload_handler.validate_model_file(self.model_path)
        self.upload_handler.validate_file(self.data_path, {'.csv'})
        self.params = self.schema_validator.validate_params(self.params)
        return model_type

    def load_and_prepare_data(self) -> pd.DataFrame:
        logger.info("Loading CSV")
        try:
            df = pd.read_csv(self.data_path)
            df = self.schema_validator.validate_csv(df, self.params)
            logger.info(f"Loaded {len(df)} rows")
            return df
        except Exception as e:
            raise ValidationError(f"Failed to load CSV: {e}")

    def run_inference(self, df: pd.DataFrame, model_type: str) -> pd.DataFrame:
        logger.info("Running inference")
        wrapper = ModelWrapper(self.model_path, model_type, self.params['features'])
        probabilities = wrapper.predict_proba(df)
        predictions = wrapper.predict(df, self.threshold)
        df = df.copy()
        df['probability'] = probabilities
        df['prediction'] = predictions
        return df

    def evaluate_fairness(self, df: pd.DataFrame) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, float], List[str]]:
        logger.info("Computing group metrics")
        group_metrics = self.metrics_engine.compute_group_metrics(
            df, 'prediction', self.params['label'], self.params['sensitive_attribute'], 'probability', self.params['positive_label']
        )
        y_true = (df[self.params['label']] == self.params['positive_label']).astype(int)
        y_pred = df['prediction'].astype(int)
        overall_metrics = {
            'total_records': int(len(df)),
            'approval_rate': float(y_pred.mean()),
            'accuracy': float(accuracy_score(y_true, y_pred)) if SKLEARN_AVAILABLE else float((y_true == y_pred).mean())
        }
        fairness_metrics = self.metrics_engine.compute_fairness_metrics(group_metrics)
        flags = self.metrics_engine.identify_flags(fairness_metrics)
        return overall_metrics, group_metrics, fairness_metrics, flags

    def generate_visualizations(self, df: pd.DataFrame, group_metrics: Dict[str, Dict[str, Any]]):
        logger.info("Generating visualizations")
        plots_dir = os.path.join(self.output_dir, 'plots')
        self.viz_generator.create_approval_rate_chart(group_metrics, plots_dir)
        self.viz_generator.create_performance_metrics_chart(group_metrics, plots_dir)
        self.viz_generator.create_roc_curves(df, self.params['label'], 'probability', self.params['sensitive_attribute'], self.params['positive_label'], plots_dir)

    def generate_reports(self, df: pd.DataFrame, overall_metrics: Dict[str, Any], group_metrics: Dict[str, Any], fairness_metrics: Dict[str, float], flags: List[str]):
        logger.info("Creating report files")
        recommendations = self.mitigation_advisor.generate_recommendations(group_metrics, fairness_metrics, flags)
        self.report_generator.generate_predictions_csv(df, 'prediction', 'probability', self.params['sensitive_attribute'], self.params.get('id_column'))
        self.report_generator.generate_group_metrics_csv(group_metrics)
        self.report_generator.generate_summary_json(overall_metrics, group_metrics, fairness_metrics, flags)
        self.report_generator.generate_recommendations_txt(recommendations)
        zip_path = self.report_generator.create_report_zip()
        return zip_path

    def run_evaluation(self) -> Dict[str, Any]:
        logger.info("Starting evaluation")
        try:
            model_type = self.validate_inputs()
            df = self.load_and_prepare_data()
            df = self.run_inference(df, model_type)
            overall_metrics, group_metrics, fairness_metrics, flags = self.evaluate_fairness(df)
            self.generate_visualizations(df, group_metrics)
            zip_path = self.generate_reports(df, overall_metrics, group_metrics, fairness_metrics, flags)
            summary = {
                'status': 'success',
                'assessment': 'FAIL' if flags else 'PASS',
                'overall': overall_metrics,
                'group_summary': group_metrics,
                'fairness_metrics': fairness_metrics,
                'flags': flags,
                'output_directory': self.output_dir,
                'report_zip': zip_path
            }
            logger.info("Evaluation complete")
            return summary
        except Exception as e:
            logger.exception("Evaluation failed")
            return {
                'status': 'error',
                'error': str(e),
                'output_directory': self.output_dir
            }

# -----------------------
# Flask API (optional)
# -----------------------
try:
    from flask import Flask, request, jsonify, send_file
    from werkzeug.utils import secure_filename
    FLASK_AVAILABLE = True
except Exception:
    FLASK_AVAILABLE = False

if FLASK_AVAILABLE:
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = UploadHandler.MAX_FILE_SIZE

    @app.route('/api/loan/evaluate', methods=['POST'])
    def evaluate_fairness_api():
        try:
            model_file = request.files.get('model_file')
            test_csv = request.files.get('test_csv')
            params_json = request.form.get('params_json')
            if not all([model_file, test_csv, params_json]):
                return jsonify({'error': 'Missing required files or params_json'}), 400
            try:
                params = json.loads(params_json)
            except Exception:
                return jsonify({'error': 'Invalid JSON in params_json'}), 400
            threshold = float(request.args.get('threshold', 0.5))

            # Create per-request temp directory for outputs
            with tempfile.TemporaryDirectory() as tmpdir:
                # Save uploads
                model_filename = secure_filename(model_file.filename)
                csv_filename = secure_filename(test_csv.filename)
                model_path = os.path.join(tmpdir, model_filename)
                csv_path = os.path.join(tmpdir, csv_filename)
                model_file.save(model_path)
                test_csv.save(csv_path)

                # create an output dir inside tmpdir to keep artifacts
                output_dir = os.path.join(tmpdir, 'fairness_results')
                evaluator = MLFairnessEvaluator(model_path, csv_path, params, threshold, output_dir=output_dir)
                result = evaluator.run_evaluation()

                if result['status'] == 'success':
                    zip_path = result['report_zip']
                    # Ensure zip exists
                    if not os.path.exists(zip_path):
                        return jsonify({'error': 'Report not found'}), 500
                    # Stream the ZIP back to the client as attachment
                    return send_file(zip_path, as_attachment=True, download_name=os.path.basename(zip_path))
                else:
                    return jsonify(result), 500
        except Exception as e:
            logger.exception("API error")
            return jsonify({'error': str(e)}), 500

    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy'})

# -----------------------
# Command-line interface
# -----------------------
def main_cli():
    parser = argparse.ArgumentParser(description='ML Model Fairness Evaluator')
    parser.add_argument('--model', required=False, help='Path to model file')
    parser.add_argument('--data', required=False, help='Path to test CSV file')
    parser.add_argument('--config', required=False, help='Path to configuration JSON file')
    parser.add_argument('--threshold', type=float, default=0.5, help='Decision threshold')
    parser.add_argument('--output', default='fairness_results', help='Output directory')
    parser.add_argument('--serve', action='store_true', help='Start API server')
    parser.add_argument('--port', type=int, default=5000, help='API server port')
    args = parser.parse_args()

    if args.serve:
        if not FLASK_AVAILABLE:
            print("Flask not available. Install Flask to use API mode.")
            return 1
        print(f"Starting API server on port {args.port}")
        app.run(host='0.0.0.0', port=args.port, debug=False)
        return 0

    # Non-server (CLI) mode
    if not (args.model and args.data and args.config):
        print("For CLI usage, --model, --data and --config are required (unless --serve).")
        return 1

    try:
        with open(args.config, 'r') as f:
            params = json.load(f)
    except Exception as e:
        print(f"Failed to load config: {e}")
        return 1

    evaluator = MLFairnessEvaluator(args.model, args.data, params, threshold=args.threshold, output_dir=args.output)
    result = evaluator.run_evaluation()

    print("\n" + "="*60)
    print("ML MODEL FAIRNESS EVALUATION RESULTS")
    print("="*60)
    if result.get('status') == 'success':
        print(f"Assessment: {result['assessment']}")
        print(f"Overall Approval Rate: {result['overall']['approval_rate']:.4f}")
        print(f"Overall Accuracy: {result['overall']['accuracy']:.4f}\n")
        print("Group Performance:")
        for group, metrics in result['group_summary'].items():
            print(f"  {group}: Approval={metrics['approval_rate']:.4f}, TPR={metrics['tpr']:.4f}, FPR={metrics['fpr']:.4f}")
        print("\nFairness Metrics:")
        for metric, value in result['fairness_metrics'].items():
            print(f"  {metric}: {value:.4f}")
        if result['flags']:
            print("\n⚠️  FAIRNESS ISSUES DETECTED:")
            for flag in result['flags']:
                print(f"  • {flag}")
        print(f"\nReport saved to: {result['output_directory']}")
        print(f"Report package: {result['report_zip']}")
        return 0
    else:
        print("Evaluation failed:", result.get('error'))
        return 1

if __name__ == '__main__':
    raise SystemExit(main_cli())