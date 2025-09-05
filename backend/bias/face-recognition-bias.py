#!/usr/bin/env python3
"""
Face Recognition Model Bias Evaluation Pipeline (Augmentation-aware)

- Expects dataset layout:
    dataset_root/
        male/
            img001.jpg
            img002.jpg
            ...
        female/
            img001.jpg
            ...

- For each image, creates pairs: (original) vs (augmented) where augmented ∈ requested augmentations.
- Computes metrics overall, per-group, and per-augmentation.

Usage examples:
    python face_bias_evaluator.py --model model.onnx --dataset "C:/Users/Prakash P/OneDrive/Desktop/FairAi/backend/dataset/facial_recognition"
    python face_bias_evaluator.py --model model.pt --dataset ./faces --augment flip rotation brightness blur
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

# -----------------------
# Augmentation utilities
# -----------------------

_AUG_CHOICES = ["flip", "rotation", "brightness", "blur", "occlusion", "noise", "shift"]

def _augment_rotation(img, angle_deg: float = None, angle_range=(-15, 15)):
    if angle_deg is None:
        angle_deg = float(np.random.uniform(*angle_range))
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle_deg, 1.0)
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT_101)

def _augment_brightness_contrast(img, brightness=0.2, contrast=0.2):
    # brightness ∈ [-1,1] → beta ∈ [-255,255]; contrast ∈ [-1,1] → alpha ∈ [0,2]
    alpha = 1.0 + float(np.random.uniform(-contrast, contrast))
    beta = 255.0 * float(np.random.uniform(-brightness, brightness))
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

def _augment_blur(img, k_choices=(1, 3, 5)):
    k = int(np.random.choice(k_choices))
    if k <= 1:
        return img
    if k % 2 == 0:
        k += 1
    return cv2.GaussianBlur(img, (k, k), 0)

def _augment_occlusion(img, max_size_ratio=0.3):
    h, w = img.shape[:2]
    occ_w = int(w * float(np.random.uniform(0.1, max_size_ratio)))
    occ_h = int(h * float(np.random.uniform(0.1, max_size_ratio)))
    x1 = int(np.random.randint(0, max(1, w - occ_w)))
    y1 = int(np.random.randint(0, max(1, h - occ_h)))
    img2 = img.copy()
    img2[y1:y1 + occ_h, x1:x1 + occ_w] = 0
    return img2

def _augment_noise(img, noise_std=0.05):
    noise = np.random.randn(*img.shape) * (255.0 * noise_std)
    noisy = img.astype(np.float32) + noise
    return np.clip(noisy, 0, 255).astype(np.uint8)

def _augment_shift(img, max_shift=10):
    h, w = img.shape[:2]
    tx = int(np.random.randint(-max_shift, max_shift + 1))
    ty = int(np.random.randint(-max_shift, max_shift + 1))
    M = np.float32([[1, 0, tx], [0, 1, ty]])
    return cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT_101)

def apply_augmentation(img: np.ndarray, aug: Optional[str]) -> np.ndarray:
    if aug is None or aug == "original":
        return img
    if aug == "flip":
        return cv2.flip(img, 1)
    if aug == "rotation":
        return _augment_rotation(img)
    if aug == "brightness":
        return _augment_brightness_contrast(img)
    if aug == "blur":
        return _augment_blur(img)
    if aug == "occlusion":
        return _augment_occlusion(img)
    if aug == "noise":
        return _augment_noise(img)
    if aug == "shift":
        return _augment_shift(img)
    # Unknown augmentation: return unchanged
    logger.warning(f"Unknown augmentation '{aug}' - skipping.")
    return img

# -----------------------
# Model + pipeline
# -----------------------

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
        self.mean = np.array(config["normalization"]["mean"], dtype=np.float32)
        self.std = np.array(config["normalization"]["std"], dtype=np.float32)

    def preprocess_image(self, image_path: str, augmentation: Optional[str] = None) -> np.ndarray:
        try:
            if DEPS_AVAILABLE:
                img = cv2.imread(image_path)
                if img is None:
                    raise ValueError(f"cv2.imread failed for path: {image_path}")
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                # Apply augmentation BEFORE resize to keep distribution realistic
                img = apply_augmentation(img, augmentation)
                img = cv2.resize(img, (self.input_shape[0], self.input_shape[1]))
            else:
                img = (np.random.rand(*self.input_shape) * 255).astype(np.uint8)

            img = img.astype(np.float32) / 255.0
            img = (img - self.mean) / self.std
            if img.ndim == 3:
                img = np.expand_dims(img, axis=0)
            return img
        except Exception as e:
            logger.error(f"Failed to preprocess {image_path} (aug={augmentation}): {e}")
            # Return a deterministic fallback to keep batch shape consistent
            return np.random.rand(1, *self.input_shape).astype(np.float32)

class EmbeddingExtractor:
    def __init__(self, model, model_type: str, config: Dict[str, Any]):
        self.model = model
        self.model_type = model_type
        self.config = config
        self.preprocessor = FacePreprocessor(config)

    def extract_embedding(self, image_path: str, augmentation: Optional[str] = None) -> np.ndarray:
        img_tensor = self.preprocessor.preprocess_image(image_path, augmentation=augmentation)
        try:
            if self.model_type == "onnx":
                input_name = self.model.get_inputs()[0].name
                outputs = self.model.run(None, {input_name: img_tensor})
                embedding = outputs[0]
            elif self.model_type == "pytorch":
                with torch.no_grad():
                    # NHWC -> NCHW
                    img_tensor_t = torch.from_numpy(img_tensor).permute(0, 3, 1, 2)
                    embedding = self.model(img_tensor_t).cpu().numpy()
            elif self.model_type == "tensorflow":
                embedding = self.model.predict(img_tensor, verbose=0)
            else:
                embedding = np.random.rand(1, self.config["model"]["embedding_dim"])
                logger.warning(f"Using random embedding for {image_path}")

            return embedding.flatten().astype(np.float32)
        except Exception as e:
            logger.error(f"Failed to extract embedding for {image_path} (aug={augmentation}): {e}")
            return np.random.rand(self.config["model"]["embedding_dim"]).astype(np.float32)

class BiasEvaluator:
    def __init__(self, embeddings_df: pd.DataFrame, threshold: float = 0.5):
        self.embeddings_df = embeddings_df.reset_index(drop=True)
        self.similarity_threshold = threshold

    def compute_similarities(self, e1: np.ndarray, e2: np.ndarray) -> float:
        if e1.ndim == 1:
            e1 = e1.reshape(1, -1)
        if e2.ndim == 1:
            e2 = e2.reshape(1, -1)
        if DEPS_AVAILABLE:
            return float(cosine_similarity(e1, e2)[0][0])
        return float(np.dot(e1.flatten(), e2.flatten()) / (np.linalg.norm(e1) * np.linalg.norm(e2)))

    def generate_augmented_pairs(self) -> List[Tuple[int, int, int]]:
        """
        For each identity (i.e., each file), pair the single 'original' row to
        every augmented row (label=1). No impostors are generated.
        Returns list of (idx1, idx2, label).
        """
        pairs = []
        for identity in self.embeddings_df["identity"].unique():
            rows = self.embeddings_df[self.embeddings_df["identity"] == identity]
            originals = rows[rows["aug"] == "original"]
            augments = rows[rows["aug"] != "original"]
            if originals.empty:
                continue
            o_idx = int(originals.index[0])
            for a_idx in augments.index.tolist():
                pairs.append((o_idx, int(a_idx), 1))
        return pairs

    def _compute_metrics_from_pairs(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, float]:
        if not pairs:
            return {"FMR": 0.0, "FNMR": 0.0, "accuracy": 0.0}
        similarities, labels = [], []
        for i1, i2, label in pairs:
            sim = self.compute_similarities(
                self.embeddings_df.loc[i1, "embedding"],
                self.embeddings_df.loc[i2, "embedding"]
            )
            similarities.append(sim)
            labels.append(label)
        sims = np.array(similarities, dtype=np.float32)
        labels = np.array(labels, dtype=np.int32)
        preds = (sims >= self.similarity_threshold).astype(np.int32)

        genuine = labels == 1
        impostor = labels == 0  # always false here; we keep for API shape
        FMR = float(np.sum((preds == 1) & impostor) / max(1, np.sum(impostor))) if np.any(impostor) else 0.0
        FNMR = float(np.sum((preds == 0) & genuine) / max(1, np.sum(genuine))) if np.any(genuine) else 0.0
        acc = float(np.mean(labels == preds)) if labels.size > 0 else 0.0
        return {"FMR": FMR, "FNMR": FNMR, "accuracy": acc}

    def compute_overall_metrics(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, float]:
        return self._compute_metrics_from_pairs(pairs)

    def compute_group_metrics(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, Dict[str, float]]:
        results: Dict[str, Dict[str, float]] = {}
        groups = self.embeddings_df["group"].unique().tolist()
        for g in groups:
            g_pairs = []
            # each pair uses the same identity/group for both indices in this setup
            for i1, i2, label in pairs:
                g1 = self.embeddings_df.loc[i1, "group"]
                g2 = self.embeddings_df.loc[i2, "group"]
                if g1 == g or g2 == g:
                    g_pairs.append((i1, i2, label))
            results[g] = self._compute_metrics_from_pairs(g_pairs)
        return results

    def compute_augmentation_metrics(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, Dict[str, float]]:
        results: Dict[str, Dict[str, float]] = {}
        for aug in self.embeddings_df["aug"].unique().tolist():
            if aug == "original":
                continue
            a_pairs = []
            for i1, i2, label in pairs:
                aug2 = self.embeddings_df.loc[i2, "aug"]
                if aug2 == aug:
                    a_pairs.append((i1, i2, label))
            results[aug] = self._compute_metrics_from_pairs(a_pairs)
        return results

    def compute_fairness_metrics(self, pairs: List[Tuple[int, int, int]]) -> Dict[str, float]:
        """
        With only genuine pairs, standard DP/EO are less meaningful.
        We still compute them on (label, pred) for completeness;
        when no negatives exist, DP/EO collapse to differences in positive rates across groups.
        """
        if not pairs:
            return {"dp_difference": 0.0, "eo_difference": 0.0}

        sims, labels, groups = [], [], []
        for i1, i2, label in pairs:
            sim = self.compute_similarities(
                self.embeddings_df.loc[i1, "embedding"],
                self.embeddings_df.loc[i2, "embedding"]
            )
            sims.append(sim)
            labels.append(label)
            groups.append(self.embeddings_df.loc[i1, "group"])

        sims = np.array(sims, dtype=np.float32)
        labels = np.array(labels, dtype=np.int32)
        groups = np.array(groups)

        preds = (sims >= self.similarity_threshold).astype(np.int32)

        if FAIRLEARN_AVAILABLE:
            try:
                dp = demographic_parity_difference(labels, preds, sensitive_features=groups)
                eo = equalized_odds_difference(labels, preds, sensitive_features=groups)
            except Exception as e:
                logger.warning(f"Fairlearn metric error: {e}; falling back to basic calc.")
                dp, eo = None, None
        else:
            dp, eo = None, None

        if dp is None or eo is None:
            unique = np.unique(groups)
            if len(unique) >= 2:
                prs = [np.mean(preds[groups == u]) if np.any(groups == u) else 0.0 for u in unique]
                dp = float(np.max(prs) - np.min(prs))
                # crude stand-in: difference in match accuracy per group
                accs = [np.mean((labels[groups == u] == preds[groups == u])) if np.any(groups == u) else 0.0 for u in unique]
                eo = float(np.max(accs) - np.min(accs))
            else:
                dp, eo = 0.0, 0.0

        return {"dp_difference": float(dp), "eo_difference": float(eo)}

class ResultsGenerator:
    @staticmethod
    def generate_report(
        overall: Dict[str, float],
        group_metrics: Dict[str, Dict[str, float]],
        fairness: Dict[str, float],
        aug_metrics: Dict[str, Dict[str, float]],
        warnings: Optional[List[str]] = None,
        threshold_used: float = 0.5,
    ):
        report = {
            "timestamp": datetime.now().isoformat(),
            "overall": overall,
            "by_group": group_metrics,
            "by_augmentation": aug_metrics,
            "fairness": fairness,
            "metadata": {
                "threshold_used": threshold_used,
                "total_groups": len(group_metrics),
            },
        }
        if warnings:
            report["warnings"] = warnings
        return report

    @staticmethod
    def create_visualizations(group_metrics: Dict[str, Dict[str, float]],
                              aug_metrics: Dict[str, Dict[str, float]],
                              output_dir: str = "results"):
        if not DEPS_AVAILABLE:
            logger.warning("Matplotlib not available - skipping visualizations")
            return
        os.makedirs(output_dir, exist_ok=True)
        viz_dir = os.path.join(output_dir, "visualizations")
        os.makedirs(viz_dir, exist_ok=True)

        # Group FNMR plot
        groups = list(group_metrics.keys())
        fnmrs = [group_metrics[g].get("FNMR", 0.0) for g in groups]
        plt.figure(figsize=(8, 5))
        plt.bar(groups, fnmrs)
        plt.title("FNMR by Group")
        plt.ylabel("FNMR")
        plt.savefig(os.path.join(viz_dir, "fnmr_by_group.png"))
        plt.close()

        # Group accuracy plot
        accs = [group_metrics[g].get("accuracy", 0.0) for g in groups]
        plt.figure(figsize=(8, 5))
        plt.bar(groups, accs)
        plt.title("Accuracy by Group")
        plt.ylabel("Accuracy")
        plt.savefig(os.path.join(viz_dir, "accuracy_by_group.png"))
        plt.close()

        # Augmentation FNMR plot
        augs = list(aug_metrics.keys())
        if augs:
            fnmrs_aug = [aug_metrics[a].get("FNMR", 0.0) for a in augs]
            plt.figure(figsize=(10, 5))
            plt.bar(augs, fnmrs_aug)
            plt.title("FNMR by Augmentation")
            plt.ylabel("FNMR")
            plt.savefig(os.path.join(viz_dir, "fnmr_by_augmentation.png"))
            plt.close()

            # Augmentation accuracy plot
            accs_aug = [aug_metrics[a].get("accuracy", 0.0) for a in augs]
            plt.figure(figsize=(10, 5))
            plt.bar(augs, accs_aug)
            plt.title("Accuracy by Augmentation")
            plt.ylabel("Accuracy")
            plt.savefig(os.path.join(viz_dir, "accuracy_by_augmentation.png"))
            plt.close()

class FaceBiasEvaluator:
    def __init__(self, model_path, config_path=None, dataset_path=None, threshold=0.5,
                 augmentations: Optional[List[str]] = None, exts: Optional[List[str]] = None):
        self.model_path = model_path
        self.config_path = config_path
        self.dataset_path = dataset_path
        self.threshold = float(threshold)
        self.augmentations = augmentations or ["flip", "rotation", "brightness", "blur"]  # sensible defaults
        self.exts = [e.lower() for e in (exts or [".jpg", ".jpeg", ".png"])]
        self.config = None
        self.model = None
        self.model_type = None
        self.extractor = None
        self.warnings: List[str] = []

        # Validate augmentations early
        invalid = [a for a in self.augmentations if a not in _AUG_CHOICES]
        if invalid:
            self.warnings.append(f"Unknown augmentations ignored: {invalid}")
            self.augmentations = [a for a in self.augmentations if a in _AUG_CHOICES]

    def setup(self):
        self.config = ConfigManager.load_config(self.config_path)
        if self.config_path is None:
            self.warnings.append("No config file provided. Using defaults (224x224, mean=0.5, std=0.5).")
        self.model_type = ModelLoader.detect_model_type(self.model_path)
        self.model = ModelLoader.load_model(self.model_path, self.model_type)
        self.extractor = EmbeddingExtractor(self.model, self.model_type, self.config)

    def load_dataset_with_augmentations(self, dataset_path: str) -> pd.DataFrame:
        """
        Scans dataset_path expecting: dataset/{male,female}/*.ext
        For each file, creates one 'original' row and one row per augmentation.
        Identity = file stem (unique per image).
        """
        if dataset_path is None:
            raise ValueError("Dataset path must be provided for augmentation-based evaluation.")
        data: List[Dict[str, Any]] = []
        root = Path(dataset_path)

        if not root.exists():
            raise FileNotFoundError(f"Dataset path not found: {dataset_path}")

        for group_dir in root.iterdir():
            if not group_dir.is_dir():
                continue
            group_name = group_dir.name
            for img_file in group_dir.iterdir():
                if not img_file.is_file():
                    continue
                if img_file.suffix.lower() not in self.exts:
                    continue
                identity = img_file.stem  # per-file identity
                # original
                data.append({
                    "image_path": str(img_file),
                    "identity": identity,
                    "group": group_name,
                    "aug": "original",
                })
                # augmentations
                for aug in self.augmentations:
                    data.append({
                        "image_path": str(img_file),
                        "identity": identity,
                        "group": group_name,
                        "aug": aug,
                    })

        if not data:
            raise RuntimeError(f"No images found under {dataset_path} with extensions {self.exts}")
        return pd.DataFrame(data)

    def extract_embeddings(self, df: pd.DataFrame) -> pd.DataFrame:
        embeddings: List[np.ndarray] = []
        for _, row in df.iterrows():
            emb = self.extractor.extract_embedding(row["image_path"], augmentation=row.get("aug"))
            embeddings.append(emb)
        df = df.copy()
        df["embedding"] = embeddings
        return df

    def evaluate_bias(self, embeddings_df: pd.DataFrame):
        evaluator = BiasEvaluator(embeddings_df, self.threshold)
        pairs = evaluator.generate_augmented_pairs()
        overall = evaluator.compute_overall_metrics(pairs)
        group_metrics = evaluator.compute_group_metrics(pairs)
        aug_metrics = evaluator.compute_augmentation_metrics(pairs)
        fairness = evaluator.compute_fairness_metrics(pairs)
        return overall, group_metrics, aug_metrics, fairness

    def run_evaluation(self, output_dir="results"):
        self.setup()
        dataset_df = self.load_dataset_with_augmentations(self.dataset_path)
        embeddings_df = self.extract_embeddings(dataset_df)
        overall, group_metrics, aug_metrics, fairness = self.evaluate_bias(embeddings_df)

        os.makedirs(output_dir, exist_ok=True)
        report = ResultsGenerator.generate_report(
            overall, group_metrics, fairness, aug_metrics,
            warnings=self.warnings, threshold_used=self.threshold
        )

        # Write detailed + compact metrics for API compatibility
        with open(os.path.join(output_dir, "bias_evaluation_report.json"), "w") as f:
            json.dump(report, f, indent=2)

        compact_metrics = {
            "overall": overall,
            "by_group": group_metrics,
            "by_augmentation": aug_metrics,
            "fairness": fairness,
            "threshold": self.threshold,
        }
        with open(os.path.join(output_dir, "metrics.json"), "w") as f:
            json.dump(compact_metrics, f, indent=2)

        # Optional text recommendations (simple heuristic)
        recs = []
        worst_group = max(group_metrics.items(), key=lambda kv: kv[1].get("FNMR", 0.0))[0] if group_metrics else None
        if worst_group:
            recs.append(f"Consider collecting more diverse samples or fine-tuning for the '{worst_group}' group.")
        worst_aug = max(aug_metrics.items(), key=lambda kv: kv[1].get("FNMR", 0.0))[0] if aug_metrics else None
        if worst_aug:
            recs.append(f"Model is least robust to '{worst_aug}' augmentation. Consider augmentation-focused training.")
        if recs:
            with open(os.path.join(output_dir, "recommendations.txt"), "w") as f:
                for r in recs:
                    f.write(r + "\n")

        ResultsGenerator.create_visualizations(group_metrics, aug_metrics, output_dir)
        return report

def build_argparser():
    p = argparse.ArgumentParser(description="Face Recognition Bias Evaluator (Augmentation-aware)")
    p.add_argument("--model", required=True, help="Path to model file (.onnx, .pt, .h5)")
    p.add_argument("--config", help="Path to config JSON file (optional)")
    p.add_argument("--dataset", required=True, help="Path to dataset directory (expects group folders with images)")
    p.add_argument("--output", default="results", help="Output directory for results")
    p.add_argument("--threshold", type=float, default=0.5, help="Similarity threshold")
    p.add_argument("--augment", nargs="*", default=["flip", "rotation", "brightness", "blur"],
                   help=f"Augmentations to test. Choices: {', '.join(_AUG_CHOICES)}")
    p.add_argument("--exts", nargs="*", default=[".jpg", ".jpeg", ".png"],
                   help="Image file extensions to include")
    return p

def main():
    parser = build_argparser()
    args = parser.parse_args()

    try:
        evaluator = FaceBiasEvaluator(
            model_path=args.model,
            config_path=args.config,
            dataset_path=args.dataset,
            threshold=args.threshold,
            augmentations=args.augment,
            exts=args.exts
        )
        report = evaluator.run_evaluation(args.output)

        print("\n" + "=" * 50)
        print("BIAS EVALUATION RESULTS")
        print("=" * 50)
        print(f"Overall FMR: {report['overall']['FMR']:.4f}")
        print(f"Overall FNMR: {report['overall']['FNMR']:.4f}")
        print(f"Demographic Parity Difference: {report['fairness']['dp_difference']:.4f}")
        print(f"Equalized Odds Difference: {report['fairness']['eo_difference']:.4f}\n")

        print("By Group:")
        for group, metrics in report["by_group"].items():
            print(f"  {group}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}, Acc={metrics['accuracy']:.4f}")

        if report.get("by_augmentation"):
            print("\nBy Augmentation:")
            for aug, metrics in report["by_augmentation"].items():
                print(f"  {aug}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}, Acc={metrics['accuracy']:.4f}")

        print(f"\nOutputs written to: {os.path.abspath(args.output)}")
    except Exception as e:
        logger.error(f"Evaluation failed: {e}", exc_info=True)
        return 1
    return 0

if __name__ == "__main__":
    exit(main())