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
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Optional, Any
import argparse
import logging
from sklearn.metrics.pairwise import cosine_similarity
import cv2

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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
    logger.warning(f"Unknown augmentation '{aug}' - skipping.")
    return img

# -----------------------
# Model loading utilities
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

        if model_type == "onnx":
            import onnxruntime as ort
            return ort.InferenceSession(model_path)
        elif model_type == "pytorch":
            import torch
            model = torch.load(model_path, map_location="cpu")
            model.eval()
            return model
        elif model_type == "tensorflow":
            import tensorflow as tf
            return tf.keras.models.load_model(model_path)
        else:
            raise RuntimeError(f"Cannot load {model_type} model - required library not available")

def load_dynamic_model(model_path: Optional[str] = None, model_type: str = None):
    """
    Dynamically load a model:
    - If model_path is provided → load ONNX / PyTorch / TensorFlow model.
    - If no path provided → load default facenet_pytorch InceptionResnetV1 (vggface2).
    """
    if not model_path:  # <-- corrected to support "continue with default"
        try:
            from facenet_pytorch import InceptionResnetV1
            model = InceptionResnetV1(pretrained='vggface2').eval()
            logger.info("Loaded default InceptionResnetV1 (pretrained on vggface2).")
            return model, "pytorch"
        except ImportError as e:
            raise RuntimeError(
                "facenet_pytorch not installed. Please install it with `pip install facenet-pytorch`."
            ) from e

    if model_type is None:
        model_type = ModelLoader.detect_model_type(model_path)

    model = ModelLoader.load_model(model_path, model_type)
    logger.info(f"Loaded {model_type} model from {model_path}")
    return model, model_type

# -----------------------
# Config + Preprocessing
# -----------------------

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

# -----------------------
# Core Components
# -----------------------

class EmbeddingExtractor:
    def __init__(self, model, model_type, config):
        self.model = model
        self.model_type = model_type
        self.config = config

    def preprocess(self, img):
        img = cv2.resize(img, tuple(self.config["input_shape"][:2]))
        img = img.astype(np.float32) / 255.0
        mean = np.array(self.config["normalization"]["mean"])
        std = np.array(self.config["normalization"]["std"])
        img = (img - mean) / std
        img = np.transpose(img, (2, 0, 1))  # CHW
        return np.expand_dims(img, 0)

    def get_embedding(self, img):
        x = self.preprocess(img)
        if self.model_type == "pytorch":
            import torch
            with torch.no_grad():
                x = torch.tensor(x).float()
                emb = self.model(x).numpy()
            return emb.flatten()
        elif self.model_type == "onnx":
            emb = self.model.run(None, {self.model.get_inputs()[0].name: x.astype(np.float32)})
            return emb[0].flatten()
        else:
            raise RuntimeError(f"Unsupported model type: {self.model_type}")

class ResultsGenerator:
    def __init__(self):
        self.results = {"pairs": []}

    def add(self, group, aug, label, sim, threshold):
        pred = int(sim >= threshold)
        self.results["pairs"].append({
            "group": group,
            "augmentation": aug,
            "label": label,
            "similarity": sim,
            "prediction": pred
        })

    def compute_metrics(self):
        df = pd.DataFrame(self.results["pairs"])
        overall = {
            "FMR": ((df["label"] == 0) & (df["prediction"] == 1)).mean(),
            "FNMR": ((df["label"] == 1) & (df["prediction"] == 0)).mean(),
            "accuracy": (df["label"] == df["prediction"]).mean(),
        }

        by_group = df.groupby("group").apply(
            lambda g: {
                "FMR": ((g["label"] == 0) & (g["prediction"] == 1)).mean(),
                "FNMR": ((g["label"] == 1) & (g["prediction"] == 0)).mean(),
                "accuracy": (g["label"] == g["prediction"]).mean(),
            }
        ).to_dict()

        by_aug = df.groupby("augmentation").apply(
            lambda g: {
                "FMR": ((g["label"] == 0) & (g["prediction"] == 1)).mean(),
                "FNMR": ((g["label"] == 1) & (g["prediction"] == 0)).mean(),
                "accuracy": (g["label"] == g["prediction"]).mean(),
            }
        ).to_dict()

        return {"overall": overall, "by_group": by_group, "by_augmentation": by_aug}

class FaceBiasEvaluator:
    def __init__(self, model_path=None, dataset_path=None, threshold=0.5,
                 augmentations=None, exts=None, config_path=None):
        self.model_path = model_path
        self.dataset_path = dataset_path
        self.threshold = threshold
        self.augmentations = augmentations or []
        self.exts = exts or [".jpg", ".jpeg", ".png"]
        self.config_path = config_path
        self.config = None
        self.model = None
        self.model_type = None
        self.extractor = None

    def setup(self):
        self.config = ConfigManager.load_config(self.config_path)
        self.model, self.model_type = load_dynamic_model(self.model_path)
        self.extractor = EmbeddingExtractor(self.model, self.model_type, self.config)

    def run_evaluation(self, output_dir="results"):
        self.setup()
        results = ResultsGenerator()
        
        # Check if dataset path exists and has subdirectories
        if not os.path.exists(self.dataset_path):
            raise ValueError(f"Dataset path does not exist: {self.dataset_path}")
            
        groups = [d for d in os.listdir(self.dataset_path) 
                 if os.path.isdir(os.path.join(self.dataset_path, d))]
        
        if not groups:
            raise ValueError(f"No group directories found in dataset path: {self.dataset_path}")
            
        logger.info(f"Found {len(groups)} groups in dataset: {', '.join(groups)}")
        
        processed_images = 0
        
        for group in groups:
            group_dir = os.path.join(self.dataset_path, group)
            image_files = [f for f in os.listdir(group_dir) 
                          if any(f.lower().endswith(ext) for ext in self.exts)]
            
            logger.info(f"Processing {len(image_files)} images in group: {group}")
            
            for fname in image_files:
                img_path = os.path.join(group_dir, fname)
                img = cv2.imread(img_path)
                if img is None:
                    logger.warning(f"Could not read image: {img_path}")
                    continue

                try:
                    orig_emb = self.extractor.get_embedding(img)
                    if orig_emb is None or np.all(orig_emb == 0):
                        logger.warning(f"Failed to extract embedding for: {img_path}")
                        continue

                    for aug in ["original"] + self.augmentations:
                        aug_img = apply_augmentation(img, aug)
                        aug_emb = self.extractor.get_embedding(aug_img)
                        
                        if aug_emb is None or np.all(aug_emb == 0):
                            logger.warning(f"Failed to extract embedding for augmented image: {img_path} ({aug})")
                            continue
                            
                        sim = cosine_similarity([orig_emb], [aug_emb])[0][0]
                        results.add(group, aug, 1, sim, self.threshold)
                        
                    processed_images += 1
                    
                except Exception as e:
                    logger.error(f"Error processing {img_path}: {str(e)}")
                    continue
        
        logger.info(f"Processed {processed_images} images with {len(self.augmentations)} augmentations each")
        
        if processed_images == 0:
            raise ValueError("No valid images were processed. Check dataset and model compatibility.")

        # Compute metrics
        report = results.compute_metrics()
        
        # Add overall accuracy and bias metrics
        overall_accuracy = report.get('overall', {}).get('accuracy', 0.0)
        overall_bias = abs(report.get('by_group', {}).get('male', {}).get('FMR', 0.0) - 
                          report.get('by_group', {}).get('female', {}).get('FMR', 0.0))
        
        metrics = {
            'accuracy': float(overall_accuracy),
            'bias': float(overall_bias),
            'detailed_metrics': report
        }
        
        # Save full report
        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, "bias_report.json"), "w") as f:
            json.dump(metrics, f, indent=2)
            
        logger.info(f"Evaluation complete. Accuracy: {overall_accuracy:.4f}, Bias: {overall_bias:.4f}")
        
        return metrics

# -----------------------
# CLI Runner
# -----------------------

def build_argparser():
    p = argparse.ArgumentParser(description="Face Recognition Bias Evaluator (Augmentation-aware)")
    p.add_argument("--model", help="Path to model file (.onnx, .pt, .h5). If omitted, loads default InceptionResnetV1.")
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
        print(f"Overall FNMR: {report['overall']['FNMR']:.4f}\n")

        print("By Group:")
        for group, metrics in report["by_group"].items():
            print(f"  {group}: FMR={metrics['FMR']:.4f}, FNMR={metrics['FNMR']:.4f}, Acc={metrics['accuracy']:.4f}")

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