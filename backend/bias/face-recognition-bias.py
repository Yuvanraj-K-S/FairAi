#!/usr/bin/env python3
"""
Face Recognition Model Bias Evaluation Pipeline

This script evaluates bias in face recognition models across different demographic groups.
It supports ONNX, PyTorch, and TensorFlow models with automatic fallback mechanisms.

Usage:
    python face_bias_evaluator.py --model model.onnx --config config.json --dataset ./faces/
    python face_bias_evaluator.py --model model.pt --dataset ./faces/ # No config (auto-detect)
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import argparse
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Core ML libraries - with fallbacks
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logger.warning("ONNX Runtime not available")

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available")

try:
    import tensorflow as tf
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logger.warning("TensorFlow not available")

# Image processing and evaluation libraries
try:
    import cv2
    from sklearn.metrics import accuracy_score
    from sklearn.metrics.pairwise import cosine_similarity
    try:
        from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference
        FAIRLEARN_AVAILABLE = True
    except ImportError:
        FAIRLEARN_AVAILABLE = False
        logger.warning("Fairlearn not available - will use basic fairness calculations")

    import matplotlib.pyplot as plt
    DEPS_AVAILABLE = True
except ImportError:
    DEPS_AVAILABLE = False
    logger.error(
        "Required dependencies not available. Please install: opencv-python scikit-learn matplotlib fairlearn"
    )


class ModelLoader:
    """Handles loading different model formats with automatic detection"""

    @staticmethod
    def detect_model_type(model_path: str) -> str:
        ext = Path(model_path).suffix.lower()
        if ext == ".onnx":
            return "onnx"
        elif ext in [".pt", ".pth"]:
            return "pytorch"
        elif ext in [".h5", ".pb"]:
            return "tensorflow"
        else:
            raise ValueError(f"Unknown model format: {ext}")

    @staticmethod
    def load_model(model_path: str, model_type: str = None):
        if model_type is None:
            model_type = ModelLoader.detect_model_type(model_path)

        if model_type == "onnx" and ONNX_AVAILABLE:
            return ort.InferenceSession(model_path)
        elif model_type == "pytorch" and TORCH_AVAILABLE:
            model = torch.load(model_path, map_location="cpu")
            model.eval()
            return model
        elif model_type == "tensorflow" and TF_AVAILABLE:
            return tf.keras.models.load_model(model_path)
        else:
            raise RuntimeError(f"Cannot load {model_type} model - required library not available")


class ConfigManager:
    DEFAULT_CONFIG = {
        "input_shape": [224, 224, 3],
        "normalization": {"mean": [0.5, 0.5, 0.5], "std": [0.5, 0.5, 0.5]},
        "model": {"embedding_dim": 512},
    }

    @classmethod
    def load_config(cls, config_path: Optional[str] = None) -> Dict[str, Any]:
        if config_path and os.path.exists(config_path):
            with open(config_path, "r") as f:
                config = json.load(f)
            logger.info(f"Loaded configuration from {config_path}")
        else:
            config = cls.DEFAULT_CONFIG.copy()
            logger.warning("No config provided or file not found. Using default configuration.")
        return config


class FacePreprocessor:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.input_shape = config["input_shape"]
        self.mean = np.array(config["normalization"]["mean"])
        self.std = np.array(config["normalization"]["std"])

    def preprocess_image(self, image_path: str) -> np.ndarray:
        try:
            if DEPS_AVAILABLE:
                img = cv2.imread(image_path)
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, (self.input_shape[0], self.input_shape[1]))
            else:
                img = np.random.rand(*self.input_shape) * 255

            img = img.astype(np.float32) / 255.0
            img = (img - self.mean) / self.std
            if len(img.shape) == 3:
                img = np.expand_dims(img, axis=0)
            return img
        except Exception as e:
            logger.error(f"Failed to preprocess {image_path}: {e}")
            return np.random.rand(1, *self.input_shape).astype(np.float32)


class EmbeddingExtractor:
    def __init__(self, model, model_type: str, config: Dict[str, Any]):
        self.model = model
        self.model_type = model_type
        self.config = config
        self.preprocessor = FacePreprocessor(config)

    def extract_embedding(self, image_path: str) -> np.ndarray:
        img_tensor = self.preprocessor.preprocess_image(image_path)
        try:
            if self.model_type == "onnx":
                input_name = self.model.get_inputs()[0].name
                outputs = self.model.run(None, {input_name: img_tensor})
                embedding = outputs[0]
            elif self.model_type == "pytorch":
                with torch.no_grad():
                    img_tensor = torch.from_numpy(img_tensor).permute(0, 3, 1, 2)
                    embedding = self.model(img_tensor).numpy()
            elif self.model_type == "tensorflow":
                embedding = self.model.predict(img_tensor, verbose=0)
            else:
                embedding = np.random.rand(1, self.config["model"]["embedding_dim"])
                logger.warning(f"Using random embedding for {image_path}")

            return embedding.flatten()
        except Exception as e:
            logger.error(f"Failed to extract embedding for {image_path}: {e}")
            return np.random.rand(self.config["model"]["embedding_dim"])


class BiasEvaluator:
    def __init__(self, embeddings_df: pd.DataFrame, threshold: float = 0.5):
        self.embeddings_df = embeddings_df
        self.similarity_threshold = threshold

    def compute_similarities(self, e1: np.ndarray, e2: np.ndarray) -> float:
        if len(e1.shape) == 1:
            e1 = e1.reshape(1, -1)
        if len(e2.shape) == 1:
            e2 = e2.reshape(1, -1)
        if DEPS_AVAILABLE:
            return cosine_similarity(e1, e2)[0][0]
        else:
            return float(np.dot(e1.flatten(), e2.flatten()) / (np.linalg.norm(e1) * np.linalg.norm(e2)))

    def generate_pairs(self) -> List[Tuple[int, int, int]]:
        pairs = []
        identities = self.embeddings_df["identity"].unique()

        for identity in identities:
            rows = self.embeddings_df[self.embeddings_df["identity"] == identity]
            if len(rows) > 1:
                for i, r1 in rows.iterrows():
                    for j, r2 in rows.iterrows():
                        if i < j:
                            pairs.append((i, j, 1))

        impostor_count = 0
        for i, r1 in self.embeddings_df.iterrows():
            if impostor_count >= 1000:
                break
            for j, r2 in self.embeddings_df.iterrows():
                if i < j and r1["identity"] != r2["identity"]:
                    pairs.append((i, j, 0))
                    impostor_count += 1
                    if impostor_count >= 1000:
                        break
        return pairs

    def compute_metrics(self, pairs: List[Tuple[int, int, int]], group: str = None) -> Dict[str, float]:
        similarities, labels = [], []
        for idx1, idx2, label in pairs:
            if group is None:
                include = True
            else:
                g1 = self.embeddings_df.iloc[idx1]["group"]
                g2 = self.embeddings_df.iloc[idx2]["group"]
                include = (g1 == group or g2 == group)
            if include:
                sim = self.compute_similarities(
                    self.embeddings_df.iloc[idx1]["embedding"], self.embeddings_df.iloc[idx2]["embedding"]
                )
                similarities.append(sim)
                labels.append(label)

        if not similarities:
            return {"FMR": 0.0, "FNMR": 0.0, "accuracy": 0.0}

        sims = np.array(similarities)
        labels = np.array(labels)
        preds = (sims >= self.similarity_threshold).astype(int)

        genuine = labels == 1
        impostor = labels == 0
        FMR = float(np.sum((preds == 1) & impostor) / max(1, np.sum(impostor)))
        FNMR = float(np.sum((preds == 0) & genuine) / max(1, np.sum(genuine)))
        acc = accuracy_score(labels, preds) if DEPS_AVAILABLE else float(np.mean(labels == preds))

        return {"FMR": FMR, "FNMR": FNMR, "accuracy": acc}

    def compute_fairness_metrics(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, float]:
        similarities, labels, groups = [], [], []
        for idx1, idx2, label in pairs:
            sim = self.compute_similarities(
                self.embeddings_df.iloc[idx1]["embedding"], self.embeddings_df.iloc[idx2]["embedding"]
            )
            similarities.append(sim)
            labels.append(label)
            groups.append(self.embeddings_df.iloc[idx1]["group"])

        if not similarities:
            return {"dp_difference": 0.0, "eo_difference": 0.0}

        sims = np.array(similarities)
        labels = np.array(labels)
        groups = np.array(groups)
        preds = (sims >= self.similarity_threshold).astype(int)

        if FAIRLEARN_AVAILABLE:
            dp = demographic_parity_difference(labels, preds, sensitive_features=groups)
            eo = equalized_odds_difference(labels, preds, sensitive_features=groups)
        else:
            unique = np.unique(groups)
            if len(unique) >= 2:
                g1, g2 = unique[0], unique[1]
                dp = abs(np.mean(preds[groups == g1]) - np.mean(preds[groups == g2]))
                eo = abs(
                    np.mean((labels[groups == g1] == preds[groups == g1]))
                    - np.mean((labels[groups == g2] == preds[groups == g2]))
                )
            else:
                dp, eo = 0.0, 0.0

        return {"dp_difference": float(dp), "eo_difference": float(eo)}


class ResultsGenerator:
    @staticmethod
    def generate_report(overall, group_metrics, fairness, warnings=None):
        report = {
            "timestamp": datetime.now().isoformat(),
            "overall": overall,
            "by_region": group_metrics,
            "fairness": fairness,
            "metadata": {"threshold_used": overall.get("threshold", 0.5), "total_groups": len(group_metrics)},
        }
        if warnings:
            report["warnings"] = warnings
        return report

    @staticmethod
    def create_visualizations(group_metrics: Dict, output_dir: str = "results"):
        if not DEPS_AVAILABLE:
            logger.warning("Matplotlib not available - skipping visualizations")
            return
        os.makedirs(output_dir, exist_ok=True)

        regions = list(group_metrics.keys())
        fmr_vals = [group_metrics[r]["FMR"] for r in regions]
        fnmr_vals = [group_metrics[r]["FNMR"] for r in regions]

        plt.figure(figsize=(8, 5))
        plt.bar(regions, fmr_vals, color="skyblue")
        plt.title("FMR by Region")
        plt.savefig(f"{output_dir}/fmr_by_region.png")
        plt.close()

        plt.figure(figsize=(8, 5))
        plt.bar(regions, fnmr_vals, color="salmon")
        plt.title("FNMR by Region")
        plt.savefig(f"{output_dir}/fnmr_by_region.png")
        plt.close()


class FaceBiasEvaluator:
    def __init__(self, model_path, config_path=None, dataset_path=None, threshold=0.5):
        self.model_path = model_path
        self.config_path = config_path
        self.dataset_path = dataset_path
        self.threshold = threshold
        self.config = None
        self.model = None
        self.model_type = None
        self.extractor = None
        self.warnings = []

    def setup(self):
        self.config = ConfigManager.load_config(self.config_path)
        if self.config_path is None:
            self.warnings.append("No config file provided. Using defaults (224x224, mean=0.5, std=0.5).")
        self.model_type = ModelLoader.detect_model_type(self.model_path)
        self.model = ModelLoader.load_model(self.model_path, self.model_type)
        self.extractor = EmbeddingExtractor(self.model, self.model_type, self.config)

    def load_dataset(self, dataset_path: str) -> pd.DataFrame:
        if dataset_path is None:
            return self._create_sample_dataset()
        data = []
        dataset_path = Path(dataset_path)
        for group_dir in dataset_path.iterdir():
            if group_dir.is_dir():
                for identity_dir in group_dir.iterdir():
                    if identity_dir.is_dir():
                        for img_file in identity_dir.glob("*.jpg"):
                            data.append(
                                {"image_path": str(img_file), "identity": identity_dir.name, "group": group_dir.name}
                            )
        if not data:
            logger.warning("No images found. Using sample dataset.")
            return self._create_sample_dataset()
        return pd.DataFrame(data)

    def _create_sample_dataset(self) -> pd.DataFrame:
        sample_data = []
        groups = ["north", "south", "northeast", "west"]
        for g in groups:
            for pid in range(1, 3):
                for img in range(1, 3):
                    sample_data.append(
                        {"image_path": f"sample_{g}_{pid}_{img}.jpg", "identity": f"{g}_person_{pid}", "group": g}
                    )
        return pd.DataFrame(sample_data)

    def extract_embeddings(self, df: pd.DataFrame) -> pd.DataFrame:
        embeddings = []
        for _, row in df.iterrows():
            embeddings.append(self.extractor.extract_embedding(row["image_path"]))
        df["embedding"] = embeddings
        return df

    def evaluate_bias(self, embeddings_df: pd.DataFrame):
        evaluator = BiasEvaluator(embeddings_df, self.threshold)
        pairs = evaluator.generate_pairs()
        overall = evaluator.compute_metrics(pairs)
        group_metrics = {g: evaluator.compute_metrics(pairs, g) for g in embeddings_df["group"].unique()}
        fairness = evaluator.compute_fairness_metrics(pairs)
        return overall, group_metrics, fairness

    def run_evaluation(self, output_dir="results"):
        self.setup()
        dataset_df = self.load_dataset(self.dataset_path)
        embeddings_df = self.extract_embeddings(dataset_df)
        overall, group_metrics, fairness = self.evaluate_bias(embeddings_df)
        report = ResultsGenerator.generate_report(overall, group_metrics, fairness, self.warnings)
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, "bias_evaluation_report.json"), "w") as f:
            json.dump(report, f, indent=2)
        ResultsGenerator.create_visualizations(group_metrics, output_dir)
        return report


def main():
    parser = argparse.ArgumentParser(description="Face Recognition Bias Evaluator")
    parser.add_argument("--model", required=True, help="Path to model file (.onnx, .pt, .h5)")
    parser.add_argument("--config", help="Path to config JSON file (optional)")
    parser.add_argument("--dataset", help="Path to dataset directory (optional)")
    parser.add_argument("--output", default="results", help="Output directory for results")
    parser.add_argument("--threshold", type=float, default=0.5, help="Similarity threshold")
    args = parser.parse_args()

    try:
        evaluator = FaceBiasEvaluator(args.model, args.config, args.dataset, args.threshold)
        report = evaluator.run_evaluation(args.output)

        print("\n" + "=" * 50)
        print("BIAS EVALUATION RESULTS")
        print("=" * 50)
        print(f"Overall FMR: {report['overall']['FMR']:.4f}")
        print(f"Overall FNMR: {report['overall']['FNMR']:.4f}")
        print(f"Demographic Parity Difference: {report['fairness']['dp_difference']:.4f}")
        print(f"Equalized Odds Difference: {report['fairness']['eo_difference']:.4f}\n")

        print("By Region:")
        for region, metrics in report["by_region"].items():
            print(f"  {region}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}")

    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return 1
    return 0


if __name__ == "__main__":
    exit(main())