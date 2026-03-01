"""
Retraining service for model fine-tuning.
"""

import json
import logging
import os
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import torch
from google.cloud import storage
from google.oauth2 import service_account
from PIL import Image
from torch.utils.data import Dataset

logger = logging.getLogger(__name__)


# ============================================================================
# SHARED GCS CLIENT
# ============================================================================


def get_storage_client() -> storage.Client:
    """Initialize Google Cloud Storage client from environment variables."""
    # First try GOOGLE_APPLICATION_CREDENTIALS path
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if credentials_path and os.path.exists(credentials_path):
        logger.info("[retraining] Using credentials from: %s", credentials_path)
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path
        )
        return storage.Client(credentials=credentials, project=credentials.project_id)

    # Fallback to individual environment variables
    credentials_dict = {
        "type": os.getenv("GCP_TYPE", "service_account"),
        "project_id": os.getenv("GCP_PROJECT_ID"),
        "private_key_id": os.getenv("GCP_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GCP_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.getenv("GCP_CLIENT_EMAIL"),
        "client_id": os.getenv("GCP_CLIENT_ID"),
        "auth_uri": os.getenv(
            "GCP_AUTH_URI",
            "https://accounts.google.com/o/oauth2/auth",
        ),
        "token_uri": os.getenv(
            "GCP_TOKEN_URI",
            "https://oauth2.googleapis.com/token",
        ),
        "auth_provider_x509_cert_url": os.getenv(
            "GCP_AUTH_PROVIDER_CERT_URL",
            "https://www.googleapis.com/oauth2/v1/certs",
        ),
        "client_x509_cert_url": os.getenv("GCP_CLIENT_CERT_URL"),
    }

    # Check if we have the minimum required fields
    if (
        credentials_dict["project_id"]
        and credentials_dict["private_key"]
        and credentials_dict["client_email"]
    ):
        logger.info(
            "[retraining] Using credentials from individual env vars for project %s",
            credentials_dict["project_id"],
        )
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict
        )
        return storage.Client(
            credentials=credentials,
            project=credentials_dict["project_id"],
        )

    # Last resort - try default credentials
    logger.warning(
        "[retraining] No explicit credentials found, using default credentials."
    )
    return storage.Client()


# ============================================================================
# CONFIGURATION
# ============================================================================


class RetrainingConfig:
    """Configuration for the retraining service."""

    def __init__(self) -> None:
        self.BUCKET_NAME = os.environ.get("BUCKET_NAME", "deepfuse-models-230632")

        # GCS Paths
        self.CURRENT_MODEL_PATH = "models/production/best_model.pth"
        self.NEW_DATA_FOLDER = "data/inference_images/"
        self.CORRECTED_ANNOTATIONS_FOLDER = "data/corrected_annotations/"
        self.MODEL_VERSIONS_FOLDER = "models/versions/"
        self.ARCHIVE_FOLDER_PREFIX = "data/archived/retrain_"
        self.RETRAIN_LOGS_FOLDER = "results/retraining_logs/"

        # Retraining Parameters
        self.MIN_NEW_IMAGES = int(os.environ.get("MIN_NEW_IMAGES", 50))
        self.FINE_TUNE_EPOCHS = int(os.environ.get("FINE_TUNE_EPOCHS", 20))
        self.LEARNING_RATE = float(os.environ.get("LEARNING_RATE", 1e-5))
        self.BATCH_SIZE = int(os.environ.get("BATCH_SIZE", 4))

        # Working Directory
        self.WORK_DIR = "/tmp/retraining"


# ============================================================================
# DATASET CLASS
# ============================================================================


class NewDataDataset(Dataset):
    """Dataset for newly collected images with corrected annotations."""

    def __init__(self, data_dir: str) -> None:
        self.data_dir = data_dir

        # Find all images
        self.image_files = [
            f
            for f in os.listdir(data_dir)
            if f.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))
        ]

        # Find corresponding annotations
        self.pairs: List[tuple[str, str]] = []
        for img_file in self.image_files:
            base_name = os.path.splitext(img_file)[0]
            json_file = f"{base_name}.json"
            json_path = os.path.join(data_dir, json_file)

            if os.path.exists(json_path):
                self.pairs.append((img_file, json_file))

        logger.info("NewDataDataset: %d image-annotation pairs", len(self.pairs))

    def __len__(self) -> int:
        return len(self.pairs)

    def __getitem__(self, idx: int):
        img_file, ann_file = self.pairs[idx]

        # Load and preprocess image
        img_path = os.path.join(self.data_dir, img_file)
        img = Image.open(img_path).convert("RGB")
        img = img.resize((512, 512), Image.BILINEAR)

        img_array = np.array(img).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_array).permute(2, 0, 1)

        # Load annotation
        ann_path = os.path.join(self.data_dir, ann_file)
        with open(ann_path, "r", encoding="utf-8") as f:
            ann = json.load(f)

        # Generate heatmaps from landmarks
        heatmaps = self._generate_heatmaps(ann["landmarks"])

        return img_tensor, heatmaps

    def _generate_heatmaps(
        self,
        landmarks: List,
        heatmap_size: int = 128,
        sigma: float = 2.0,
    ) -> torch.Tensor:
        """Generate Gaussian heatmaps from landmark coordinates."""
        num_landmarks = 19
        heatmaps = torch.zeros(num_landmarks, heatmap_size, heatmap_size)

        scale = heatmap_size / 512.0

        for i, lm in enumerate(landmarks[:num_landmarks]):
            # Parse landmark (flexible format)
            if isinstance(lm, dict):
                x, y = lm.get("x", 0), lm.get("y", 0)
            elif isinstance(lm, (list, tuple)):
                x, y = lm[0], lm[1]
            else:
                continue

            # Scale to heatmap coordinates
            x_hm = int(x * scale)
            y_hm = int(y * scale)

            # Generate Gaussian
            radius = 3 * int(sigma)
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    xx = x_hm + dx
                    yy = y_hm + dy

                    if 0 <= xx < heatmap_size and 0 <= yy < heatmap_size:
                        dist_sq = dx**2 + dy**2
                        value = float(np.exp(-dist_sq / (2 * sigma**2)))
                        heatmaps[i, yy, xx] = max(heatmaps[i, yy, xx], value)

        return heatmaps


# ============================================================================
# RETRAINING SERVICE
# ============================================================================


class RetrainingService:
    """Service for managing model retraining operations."""

    def __init__(self, config: Optional[RetrainingConfig] = None) -> None:
        self.config = config or RetrainingConfig()
        self.storage_client = get_storage_client()
        self.bucket = self.storage_client.bucket(self.config.BUCKET_NAME)

        # Job status tracking (in-memory, could be Redis/DB in production)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def validate_data_availability(self) -> dict:
        """Check if enough data is available for retraining."""
        try:
            bucket = self.bucket

            # Count images in inference_images folder
            inference_blobs = list(
                bucket.list_blobs(prefix=self.config.NEW_DATA_FOLDER)
            )
            num_inference_images = len([
                b
                for b in inference_blobs
                if not b.name.endswith("/")
                and any(
                    b.name.lower().endswith(ext)
                    for ext in (".png", ".jpg", ".jpeg", ".bmp")
                )
            ])

            # Count corrected annotations
            corrected_blobs = list(
                bucket.list_blobs(prefix=self.config.CORRECTED_ANNOTATIONS_FOLDER)
            )
            num_corrections = len([
                b
                for b in corrected_blobs
                if not b.name.endswith("/") and b.name.lower().endswith(".json")
            ])

            # Count matched pairs (images that have corresponding annotations)
            matched_pairs = min(num_inference_images, num_corrections)

            min_threshold = self.config.MIN_NEW_IMAGES
            has_enough_data = num_inference_images >= min_threshold

            if has_enough_data:
                message = (
                    "Sufficient data available: "
                    f"{num_inference_images} images (threshold: {min_threshold})"
                )
            else:
                message = (
                    "Insufficient data: "
                    f"{num_inference_images}/{min_threshold} images needed"
                )

            logger.info(
                "Data validation: %d images, %d corrections",
                num_inference_images,
                num_corrections,
            )

            return {
                "has_enough_data": has_enough_data,
                "num_images": num_inference_images,  # Changed from num_new_images
                "num_annotations": num_corrections,  # Changed from num_corrections
                "min_required": min_threshold,  # Changed from min_threshold
                "matched_pairs": matched_pairs,  # Added this field
                "message": message,
            }

        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to validate data availability: %s", exc)
            return {
                "has_enough_data": False,
                "num_images": 0,  # Changed from num_new_images
                "num_annotations": 0,  # Changed from num_corrections
                "min_required": self.config.MIN_NEW_IMAGES,
                "matched_pairs": 0,  # Added this field
                "message": f"Error checking data: {exc}",
            }

    def trigger_retraining(
        self,
        force: bool = False,
        epochs: Optional[int] = None,
        learning_rate: Optional[float] = None,
        batch_size: Optional[int] = None,
    ) -> dict:
        """Trigger a new retraining job."""
        if not force:
            validation = self.validate_data_availability()
            if not validation["has_enough_data"]:
                raise ValueError(validation["message"])

        job_id = str(uuid.uuid4())
        job_data: Dict[str, Any] = {
            "job_id": job_id,
            "status": "pending",
            "started_at": datetime.utcnow().isoformat(),
            "progress": 0,
            "current_step": "Initializing...",
            "params": {
                "epochs": epochs or self.config.FINE_TUNE_EPOCHS,
                "learning_rate": learning_rate or self.config.LEARNING_RATE,
                "batch_size": batch_size or self.config.BATCH_SIZE,
            },
        }

        with self.lock:
            self.jobs[job_id] = job_data

        thread = threading.Thread(target=self._run_retraining, args=(job_id,))
        thread.daemon = True
        thread.start()

        return {
            "job_id": job_id,
            "status": "pending",
            "message": "Retraining job started",
        }

    def _run_retraining(self, job_id: str) -> None:
        """Run the actual retraining process."""
        try:
            # Import here to avoid circular dependencies.
            from api.core.retraining_wrapper import run_retraining_job

            with self.lock:
                self.jobs[job_id]["status"] = "training"
                self.jobs[job_id]["current_step"] = "Initializing..."
                self.jobs[job_id]["progress"] = 5

            def update_progress(progress: int, step: str) -> None:
                with self.lock:
                    self.jobs[job_id]["progress"] = progress
                    self.jobs[job_id]["current_step"] = step

            params = self.jobs[job_id]["params"]

            logger.info("Starting retraining for job %s", job_id)
            result = run_retraining_job(
                job_id=job_id,
                epochs=params["epochs"],
                learning_rate=params["learning_rate"],
                batch_size=params["batch_size"],
                progress_callback=update_progress,
            )

            with self.lock:
                self.jobs[job_id]["status"] = "completed"
                self.jobs[job_id]["progress"] = 100
                self.jobs[job_id]["current_step"] = "Completed"
                self.jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
                self.jobs[job_id]["metrics"] = result["metrics"]
                self.jobs[job_id]["model_name"] = result["model_name"]
                self.jobs[job_id]["num_images_processed"] = result[
                    "num_images_processed"
                ]

                duration = (
                    datetime.fromisoformat(self.jobs[job_id]["completed_at"])
                    - datetime.fromisoformat(self.jobs[job_id]["started_at"])
                ).total_seconds()
                self.jobs[job_id]["duration_seconds"] = duration

            logger.info("Retraining job %s completed successfully", job_id)

            self._archive_training_data(job_id)

        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Retraining job %s failed: %s",
                job_id,
                exc,
                exc_info=True,
            )
            with self.lock:
                self.jobs[job_id]["status"] = "failed"
                self.jobs[job_id]["error_message"] = str(exc)
                self.jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()

    def _archive_training_data(self, job_id: str) -> None:
        """Move used training data to archive folder to prevent reuse."""
        try:
            bucket = self.bucket

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_prefix = f"data/archive/training_{timestamp}/"

            logger.info("Archiving training data to %s", archive_prefix)

            # Move inference images to archive
            inference_blobs = list(
                bucket.list_blobs(prefix=self.config.NEW_DATA_FOLDER)
            )
            moved_count = 0

            for blob in inference_blobs:
                if not blob.name.endswith("/"):
                    filename = blob.name.split("/")[-1]
                    new_name = f"{archive_prefix}inference_images/{filename}"
                    bucket.copy_blob(blob, bucket, new_name)
                    blob.delete()
                    moved_count += 1

            # Move corrected annotations to archive
            corrected_blobs = list(
                bucket.list_blobs(prefix=self.config.CORRECTED_ANNOTATIONS_FOLDER)
            )

            for blob in corrected_blobs:
                if not blob.name.endswith("/"):
                    filename = blob.name.split("/")[-1]
                    new_name = f"{archive_prefix}corrected_annotations/{filename}"
                    bucket.copy_blob(blob, bucket, new_name)
                    blob.delete()
                    moved_count += 1

            # Move predictions if they exist
            prediction_blobs = list(bucket.list_blobs(prefix="data/predictions/"))

            for blob in prediction_blobs:
                if not blob.name.endswith("/"):
                    filename = blob.name.split("/")[-1]
                    new_name = f"{archive_prefix}predictions/{filename}"
                    bucket.copy_blob(blob, bucket, new_name)
                    blob.delete()
                    moved_count += 1

            logger.info(
                "Archived %d files for job %s to %s",
                moved_count,
                job_id,
                archive_prefix,
            )

            with self.lock:
                self.jobs[job_id]["archive_location"] = archive_prefix
                self.jobs[job_id]["archived_files"] = moved_count

        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to archive training data: %s", exc)

    def get_job_status(self, job_id: str) -> Optional[dict]:
        """Get the status of a retraining job."""
        with self.lock:
            return self.jobs.get(job_id)

    def get_job_history(self, limit: int = 10) -> list:
        """Get history of recent retraining jobs."""
        with self.lock:
            jobs = list(self.jobs.values())
            jobs.sort(key=lambda x: x.get("started_at", ""), reverse=True)
            return jobs[:limit]


# ============================================================================
# SINGLETON ACCESSOR
# ============================================================================


_retraining_service: Optional[RetrainingService] = None


def get_retraining_service() -> RetrainingService:
    """Get or create the retraining service instance."""
    global _retraining_service
    if _retraining_service is None:
        _retraining_service = RetrainingService()
    return _retraining_service
