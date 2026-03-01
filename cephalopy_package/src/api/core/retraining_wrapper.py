"""
Wrapper for retraining that integrates actual training code with GCS upload
"""

import json
import logging
import tempfile
from datetime import datetime
from pathlib import Path

import torch
from google.cloud import storage

from cephalopy.models import model_class, training

logger = logging.getLogger(__name__)

BUCKET_NAME = "deepfuse-models-230632"


def _download_training_data_from_gcs(local_dir: Path) -> Path:
    """
    Download training data from GCS to local directory

    Args:
        local_dir: Local directory to download data to

    Returns:
        Path to the downloaded data directory
    """
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)

        # Create data structure
        data_dir = local_dir / "training_data"
        ceph_dir = data_dir / "Cephalograms"
        ann_dir = data_dir / "Annotations"

        ceph_dir.mkdir(parents=True, exist_ok=True)
        ann_dir.mkdir(parents=True, exist_ok=True)

        logger.info("Downloading training data from GCS...")

        # Download inference images (X-rays)
        inference_blobs = list(bucket.list_blobs(prefix="data/inference_images/"))
        image_count = 0

        for blob in inference_blobs:
            if not blob.name.endswith("/") and any(
                blob.name.lower().endswith(ext)
                for ext in [".png", ".jpg", ".jpeg", ".bmp"]
            ):
                filename = blob.name.split("/")[-1]
                local_path = ceph_dir / filename
                blob.download_to_filename(str(local_path))
                image_count += 1

        logger.info(f"Downloaded {image_count} X-ray images")

        # Download corrected annotations
        corrected_blobs = list(bucket.list_blobs(prefix="data/corrected_annotations/"))
        annotation_count = 0

        for blob in corrected_blobs:
            if not blob.name.endswith("/") and blob.name.lower().endswith(".json"):
                filename = blob.name.split("/")[-1]
                local_path = ann_dir / filename
                blob.download_to_filename(str(local_path))
                annotation_count += 1

        logger.info(f"Downloaded {annotation_count} annotations")

        if image_count == 0:
            raise ValueError("No training images found in GCS")

        if annotation_count == 0:
            raise ValueError("No annotations found in GCS")

        logger.info(f"Training data ready at {data_dir}")
        return data_dir

    except Exception as e:
        logger.error(f"Failed to download training data from GCS: {e}")
        raise


def run_retraining_job(
    job_id: str,
    epochs: int = 10,
    learning_rate: float = 0.0001,
    batch_size: int = 8,
    dataset_paths: list = None,
    progress_callback=None,
):
    """
    Run actual model retraining and upload to GCS

    Args:
        job_id: Unique identifier for this training job
        epochs: Number of training epochs
        learning_rate: Learning rate for optimizer
        batch_size: Batch size for training
        dataset_paths: List of paths to training data (if None, downloads from GCS)
        progress_callback: Function to call with progress updates

    Returns:
        dict: Contains model_path, metrics, and metadata
    """

    # Create temporary directory for this training job
    with tempfile.TemporaryDirectory(prefix=f"retraining_{job_id}_") as tmp_dir:
        tmp_path = Path(tmp_dir)

        # Update progress
        if progress_callback:
            progress_callback(5, "Downloading training data from GCS...")

        # Download training data from GCS if no local paths provided
        if dataset_paths is None:
            dataset_paths = [str(_download_training_data_from_gcs(tmp_path))]
            logger.info(f"Downloaded training data to {dataset_paths[0]}")

        checkpoint_dir = tmp_path / "checkpoints"
        checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Update progress
        if progress_callback:
            progress_callback(10, "Loading data...")

        # Configuration for training
        CONFIG = {
            "num_epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "image_size": [512, 512],
            "heatmap_size": [128, 128],
            "num_landmarks": 19,
            "sigma": 2.0,
            "train_ratio": 0.7,
            "val_ratio": 0.15,
            "patience": 10,
            "checkpoint_dir": str(checkpoint_dir),
            "model_dir": str(checkpoint_dir),
        }

        logger.info(f"Training configuration: {CONFIG}")
        logger.info(f"Device: {CONFIG['device']}")

        # Update progress
        if progress_callback:
            progress_callback(20, "Creating data loaders...")

        # Create data loaders
        train_loader, val_loader, test_loader = training.create_loaders(
            dataset_paths, CONFIG
        )

        # Update progress
        if progress_callback:
            progress_callback(30, "Initializing model...")

        # Initialize model
        model = model_class.DeepFuseCephalogramNet(CONFIG["num_landmarks"]).to(
            CONFIG["device"]
        )

        # Training setup
        criterion = model_class.AdaptiveWingLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=CONFIG["learning_rate"])
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", patience=10, factor=0.5
        )

        # Update progress
        if progress_callback:
            progress_callback(40, "Training model...")

        logger.info(f"Starting training for {epochs} epochs...")

        # Train the model
        _ = training.train_model(
            model,
            train_loader,
            val_loader,
            optimizer,
            scheduler,
            criterion,
            CONFIG,
            CONFIG["device"],
            CONFIG["num_epochs"],
        )

        # Update progress
        if progress_callback:
            progress_callback(70, "Evaluating model...")

        # Get the best model path
        best_model_path = checkpoint_dir / "best_model.pth"

        if not best_model_path.exists():
            raise FileNotFoundError(f"Trained model not found at {best_model_path}")

        # Load the checkpoint to get metrics
        checkpoint = torch.load(best_model_path, map_location="cpu", weights_only=False)

        # Extract metrics
        metrics = {
            "mre": checkpoint.get("mre", 0.0),
            "sdr_2mm": checkpoint.get("sdr_2mm", 0.0),
            "sdr_2_5mm": checkpoint.get("sdr_2_5mm", 0.0),
            "sdr_3mm": checkpoint.get("sdr_3mm", 0.0),
            "sdr_4mm": checkpoint.get("sdr_4mm", 0.0),
        }

        logger.info(f"Training complete. Metrics: {metrics}")

        # Update progress
        if progress_callback:
            progress_callback(85, "Uploading model to GCS...")

        # Generate model name
        model_name = f"retrained_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Upload to GCS
        upload_model_to_gcs(
            model_path=best_model_path,
            model_name=model_name,
            metrics=metrics,
            training_config={
                "job_id": job_id,
                "epochs": epochs,
                "learning_rate": learning_rate,
                "batch_size": batch_size,
                "num_images": len(train_loader.dataset),
            },
        )

        # Update progress
        if progress_callback:
            progress_callback(100, "Completed")

        logger.info(f"Model {model_name} uploaded successfully to GCS")

        return {
            "model_name": model_name,
            "metrics": metrics,
            "num_images_processed": len(train_loader.dataset),
        }


def upload_model_to_gcs(model_path, model_name, metrics, training_config):
    """
    Upload trained model and metadata to GCS

    Args:
        model_path: Path to the .pth file
        model_name: Name for the model in GCS
        metrics: Dictionary of performance metrics
        training_config: Dictionary of training configuration
    """
    try:
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)

        # Upload model file
        model_blob = bucket.blob(f"models/production/{model_name}.pth")
        model_blob.upload_from_filename(str(model_path))
        logger.info(f"Uploaded model file to GCS: {model_name}.pth")

        # Create metadata
        metadata = {
            "version": "v2.0",
            "model_name": model_name,
            "retrain_date": datetime.utcnow().isoformat(),
            "architecture": "ResNet-50 with heatmap regression (DeepFuse)",
            "metrics": {
                "mre": float(metrics["mre"]),
                "sdr_2mm": float(metrics["sdr_2mm"]),
                "sdr_2_5mm": float(metrics["sdr_2_5mm"]),
                "sdr_3mm": float(metrics["sdr_3mm"]),
                "sdr_4mm": float(metrics["sdr_4mm"]),
            },
            "training_info": {
                "job_id": training_config["job_id"],
                "dataset": "Production data + corrections",
                "num_images": training_config["num_images"],
                "epochs": training_config["epochs"],
                "learning_rate": training_config["learning_rate"],
                "batch_size": training_config["batch_size"],
            },
        }

        # Upload metadata
        metadata_blob = bucket.blob(f"models/production/{model_name}_metadata.json")
        metadata_blob.upload_from_string(json.dumps(metadata, indent=2))
        logger.info(f"Uploaded metadata to GCS: {model_name}_metadata.json")

    except Exception as e:
        logger.error(f"Failed to upload model to GCS: {e}")
        raise
