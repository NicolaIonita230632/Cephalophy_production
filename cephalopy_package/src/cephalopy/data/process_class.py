"""
Cephalometric Dataset Class for DeepFuse Model.
"""

import json
import os
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from torch.utils.data import Dataset


class CephalometricDataset(Dataset):
    """
    Original code idea by Arnout, code adapted for DeepFuse model by Nicola.
    Dataset for DeepFuse with heatmap-based landmark detection.

    Key differences from coordinate regression:
      - Generates 2D Gaussian heatmaps for each landmark
      - Preserves spatial information better
      - More robust to initialization

    Args:
        dataset_paths (list of str)
            List of dataset directory paths.
        image_size (tuple)
            Size to which images are resized (height, width).
        heatmap_size (tuple)
            Size of the generated heatmaps (height, width).
        sigma (float)
            Standard deviation for Gaussian heatmaps.

    Returns:
        Dataset object for DeepFuse landmark detection.
    """

    def __init__(
        self, dataset_paths, image_size=(512, 512), heatmap_size=(128, 128), sigma=2.0
    ):
        self.image_size = image_size  # (height, width)
        self.heatmap_size = heatmap_size
        self.sigma = sigma
        self.samples = []

        # Collect samples
        for dataset_path in dataset_paths:
            dataset_path = Path(dataset_path)
            ceph_dir = dataset_path / "Cephalograms"
            ann_dir = dataset_path / "Annotations"

            if not ceph_dir.exists():
                print(f"Warning: {ceph_dir} not found, skipping...")
                continue

            for img_file in sorted(ceph_dir.glob("*_cephalogram.*")):
                base_name = img_file.stem.replace("_cephalogram", "")
                ann_file = ann_dir / f"{base_name}_annotation.json"

                if ann_file.exists():
                    self.samples.append((img_file, ann_file))

        print(f"Loaded {len(self.samples)} images")

        if self.samples:
            with open(self.samples[0][1]) as f:
                self.num_landmarks = len(json.load(f)["landmarks"])

    def __len__(self):
        return len(self.samples)

    def generate_heatmap(self, landmarks, original_size):
        """
        Generate Gaussian heatmaps for landmarks.

        Following Equation 3 from the paper:
        H_i(u,v) = exp(-(u-x_i)^2 + (v-y_i)^2) / (2*sigma^2))

        Args:
            landmarks (list)
                List of landmark dictionaries with 'value' keys.
            original_size (tuple)
                Original image size (width, height).
        Returns:
            Array with heatmaps of shape (num_landmarks, heatmap_height, heatmap_width).
        """
        heatmaps = np.zeros(
            (self.num_landmarks, self.heatmap_size[0], self.heatmap_size[1]),
            dtype=np.float32,
        )

        # Calculate scale factors from original to heatmap size
        scale_x = self.heatmap_size[1] / original_size[0]  # width scaling
        scale_y = self.heatmap_size[0] / original_size[1]  # height scaling

        for i, lm in enumerate(landmarks):
            # Scale landmark to heatmap coordinates
            x = lm["value"]["x"] * scale_x
            y = lm["value"]["y"] * scale_y

            # Ensure landmarks are within bounds
            if x < 0 or x >= self.heatmap_size[1] or y < 0 or y >= self.heatmap_size[0]:
                continue

            # Generate Gaussian heatmap
            xx, yy = np.meshgrid(
                np.arange(self.heatmap_size[1]), np.arange(self.heatmap_size[0])
            )

            heatmap = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * self.sigma**2))
            heatmaps[i] = heatmap

        return heatmaps

    def __getitem__(self, idx):
        """
        Get item for DataLoader.
        Args:
            idx (int)
                Index of the sample.
        Returns:
            Image tensor, heatmaps tensor, original landmarks,
            original size, and filename.
        """
        img_path, ann_path = self.samples[idx]

        # Load image
        try:
            image = Image.open(img_path).convert("RGB")
        except (OSError, UnidentifiedImageError):
            img_bgr = cv2.imread(str(img_path))
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(img_rgb)

        original_size = image.size  # (width, height)

        # Resize image
        image_resized = image.resize(
            (self.image_size[1], self.image_size[0]), Image.BILINEAR
        )

        # Load landmarks
        with open(ann_path) as f:
            landmarks = json.load(f)["landmarks"]

        # Store original landmarks for evaluation
        original_landmarks = [
            {"value": {"x": lm["value"]["x"], "y": lm["value"]["y"]}}
            for lm in landmarks
        ]

        # Generate heatmaps
        heatmaps = self.generate_heatmap(landmarks, original_size)

        # Convert image to tensor with ImageNet normalization
        image_np = np.array(image_resized, dtype=np.float32) / 255.0
        image_tensor = torch.from_numpy(image_np).permute(2, 0, 1)

        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        image_tensor = (image_tensor - mean) / std

        return {
            "image": image_tensor,
            "heatmaps": torch.FloatTensor(heatmaps),
            "landmarks": original_landmarks,
            "original_size": original_size,
            "filename": img_path.name,
        }


def save_config(
    seed=42,
    device="cuda",
    batch_size=8,
    num_epochs=150,
    learning_rate=1e-4,
    image_size=(512, 512),
    heatmap_size=(128, 128),
    num_landmarks=19,
    sigma=2.0,
    patience=25,
    train_ratio=0.70,
    val_ratio=0.15,
    test_ratio=0.15,
    checkpoint_dir="checkpoints",
    model_dir="deepfuse_model",
    config_file="config_deepfuse_ceph.json",
):
    """
    Function by Jason.
    Save configuration parameters to JSON for reproducibility.

    Args:
        seed (int)
            Random seed for reproducibility.
        device (str)
            Device to use ('cuda' or 'cpu').
        batch_size (int)
            Batch size for training.
        num_epochs (int)
            Number of training epochs.
        learning_rate (float)
            Learning rate for optimizer.
        image_size (tuple)
            Size to which images are resized.
        heatmap_size (tuple)
            Size of the generated heatmaps.
        num_landmarks (int)
            Number of landmarks to detect.
        sigma (float)
            Standard deviation for Gaussian heatmaps.
        patience (int)
            Patience for early stopping.
        train_ratio (float)
            Proportion of data for training.
        val_ratio (float)
            Proportion of data for validation.
        test_ratio (float)
            Proportion of data for testing.
        checkpoint_dir (str)
            Directory to save model checkpoints.
        model_dir (str)
            Directory to save the model and config.
        config_file (str)
            Filename to save the configuration JSON.

    Returns:
        CONFIG (dict): Configuration dictionary.
    """
    if device == "cuda":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    CONFIG = {
        "seed": seed,
        "device": device,
        "batch_size": batch_size,
        "num_epochs": num_epochs,
        "learning_rate": learning_rate,
        "image_size": image_size,
        "heatmap_size": heatmap_size,
        "num_landmarks": num_landmarks,
        "sigma": sigma,
        "train_ratio": train_ratio,
        "val_ratio": val_ratio,
        "test_ratio": test_ratio,
        "checkpoint_dir": f"models/{model_dir}/{checkpoint_dir}",
        "model_dir": model_dir,
        "patience": patience,
    }
    os.makedirs(f"models/{model_dir}", exist_ok=True)
    # Save to JSON
    with open(f"models/{model_dir}/config.json", "w") as f:
        json.dump(CONFIG, f, indent=2)

    print(f"Config saved as {config_file}")
    return CONFIG
