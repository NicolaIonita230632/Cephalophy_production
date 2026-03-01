"""
Core dependencies: model loading, config, and model info.

This version loads the active DeepFuse model from Google Cloud Storage
instead of a local .pth file.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import torch
from google.cloud import storage

from api.core.models import DeepFuseCephalogramNet

logger = logging.getLogger(__name__)

# Check if GCS is available.
try:
    from google.cloud import storage
    from google.oauth2 import service_account

    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    logger.warning(
        "[deps] google-cloud-storage not installed, GCS functionality disabled"
    )


# -------------------------------------------------------------------
# GCS CONFIG
# -------------------------------------------------------------------

BUCKET_NAME = os.getenv("BUCKET_NAME", "deepfuse-models-230632")

# Fallback model blob if no active model is configured
DEFAULT_MODEL_BLOB = os.getenv(
    "DEFAULT_MODEL_BLOB",
    "models/production/best_model.pth",
)

# Where to cache the downloaded model locally
GCS_MODEL_PATH = os.getenv(
    "MODEL_LOCAL_PATH",
    "models/deepfuse_model/best_model_from_gcs.pth",
)
# The model path used locally.
LOCAL_MODEL_PATH = os.getenv(
    "MODEL_LOCAL_PATH",
    "models/deepfuse_model/best_model.pth",
)


def get_local_model_path() -> Path:
    """
    Get local path of the model file.
    This path is: PROJECT_ROOT/models/deepfuse_model/best_model.pth
    """
    current_file = Path(__file__).resolve()
    src_dir = current_file.parent.parent.parent
    project_root = src_dir.parent
    return project_root / LOCAL_MODEL_PATH


# -------------------------------------------------------------------
# SHARED GCS CLIENT
# -------------------------------------------------------------------


def get_storage_client() -> storage.Client:
    """Initialize Google Cloud Storage client from environment variables."""
    if not GCS_AVAILABLE:
        raise RuntimeError("google-cloud-storage is not installed")

    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if credentials_path and os.path.exists(credentials_path):
        logger.info(f"[deps] Using credentials from: {credentials_path}")
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path
        )
        return storage.Client(credentials=credentials, project=credentials.project_id)

    credentials_dict = {
        "type": os.getenv("GCP_TYPE", "service_account"),
        "project_id": os.getenv("GCP_PROJECT_ID"),
        "private_key_id": os.getenv("GCP_PRIVATE_KEY_ID"),
        "private_key": os.getenv("GCP_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.getenv("GCP_CLIENT_EMAIL"),
        "client_id": os.getenv("GCP_CLIENT_ID"),
        "auth_uri": os.getenv(
            "GCP_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"
        ),
        "token_uri": os.getenv("GCP_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.getenv(
            "GCP_AUTH_PROVIDER_CERT_URL",
            "https://www.googleapis.com/oauth2/v1/certs",
        ),
        "client_x509_cert_url": os.getenv("GCP_CLIENT_CERT_URL"),
    }

    if (
        credentials_dict["project_id"]
        and credentials_dict["private_key"]
        and credentials_dict["client_email"]
    ):
        logger.info("[deps] Using credentials from environment variables")
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict
        )
        return storage.Client(
            credentials=credentials, project=credentials_dict["project_id"]
        )

    logger.warning(
        "[deps] No credentials found in environment, trying default credentials"
    )
    return storage.Client()


# -------------------------------------------------------------------
# MODEL STATE
# -------------------------------------------------------------------

_model: Optional[torch.nn.Module] = None
_device: Optional[torch.device] = None
_current_model_name: Optional[str] = None
_is_loaded: bool = False

# Minimal runtime config used by predictions.py
_config: Dict[str, Any] = {
    # Height, width – must match how you trained DeepFuse
    "image_size": (512, 512),
    # Will be set to "cuda" or "cpu" in load_model()
    "device": "cpu",
    # Add num_landmarks for compatibility
    "num_landmarks": 19,
}


def _get_active_model_blob_path() -> str:
    """
    Read models/production/active_model.json from GCS.
    If present, return models/production/{active_model}.pth
    Else fall back to DEFAULT_MODEL_BLOB.
    """
    client = get_storage_client()
    bucket = client.bucket(BUCKET_NAME)
    active_blob = bucket.blob("models/production/active_model.json")

    if active_blob.exists():
        cfg = json.loads(active_blob.download_as_text())
        active_name = cfg.get("active_model")
        if active_name:
            logger.info(f"[deps] Active model from GCS: {active_name}")
            return f"models/production/{active_name}.pth"

    logger.warning(
        f"[deps] No active_model.json or no active_model set. "
        f"Falling back to {DEFAULT_MODEL_BLOB}"
    )
    return DEFAULT_MODEL_BLOB


def _download_model_from_gcs() -> str:
    """
    Download the active model from GCS to GCS_MODEL_PATH.
    Returns the local path.
    """
    client = get_storage_client()
    bucket = client.bucket(BUCKET_NAME)

    blob_path = _get_active_model_blob_path()
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise FileNotFoundError(
            f"Model blob {blob_path} not found in bucket {BUCKET_NAME}"
        )

    os.makedirs(os.path.dirname(GCS_MODEL_PATH), exist_ok=True)
    blob.download_to_filename(GCS_MODEL_PATH)
    size_mb = os.path.getsize(GCS_MODEL_PATH) / (1024 * 1024)
    logger.info(
        f"[deps] Downloaded model from gs://{BUCKET_NAME}/{blob_path} "
        f"to {GCS_MODEL_PATH} ({size_mb:.1f} MB)"
    )

    global _current_model_name
    _current_model_name = os.path.splitext(os.path.basename(blob_path))[0]
    model_name = os.path.splitext(os.path.basename(blob_path))[0]
    return GCS_MODEL_PATH, model_name


# -------------------------------------------------------------------
# PUBLIC API USED BY THE REST OF THE APP
# -------------------------------------------------------------------


def load_model():
    """
    Load model from GCS (called on startup via lifespan in main.py) or local.
    """
    global _model, _device, _is_loaded, _config, _current_model_name
    model_path = None

    if GCS_AVAILABLE:
        try:
            logger.info("[deps] Attempting to load model from GCS...")
            model_path, _current_model_name = _download_model_from_gcs()
            logger.info("[deps] Successfully downloaded model from GCS")
        except Exception as e:
            logger.warning(f"[deps] Failed to load from GCS: {e}")
            logger.info("[deps] Falling back to local model...")
            model_path = None
    # If no model is found, fall back to local model.
    if model_path is None:
        print("Trying local")
        local_path = get_local_model_path()
        print(local_path)
        if not local_path.exists():
            raise FileNotFoundError(
                f"Model file not found at {local_path}. "
                f"Please ensure the model exists locally or configure GCS credentials."
            )

        model_path = str(local_path)
        _current_model_name = "DeepFuse"
        logger.info(f"[deps] Using local model at: {model_path}")

    # Load the model.
    try:
        # Decide device
        device_str = os.getenv("MODEL_DEVICE", None)
        if device_str is None:
            device_str = "cuda" if torch.cuda.is_available() else "cpu"

        _device = torch.device(device_str)
        _config["device"] = device_str

        logger.info(f"[deps] Using device: {_device}")

        checkpoint = torch.load(model_path, map_location=_device, weights_only=False)

        model = DeepFuseCephalogramNet(num_landmarks=_config["num_landmarks"])

        # checkpoint can be full dict or pure state_dict
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint

        model.load_state_dict(state_dict)
        model.to(_device)
        model.eval()

        _model = model
        _is_loaded = True

        logger.info(f"[deps] Model loaded successfully as '{_current_model_name}'")

    except Exception as e:
        logger.error(f"[deps] Failed to load model: {e}", exc_info=True)
        _model = None
        _is_loaded = False
        _current_model_name = None
        raise


def reload_model():
    """
    Reload model when active model changes (called from /models/{id}/activate).
    """
    logger.info("[deps] Reloading model...")
    load_model()


def get_model() -> torch.nn.Module:
    """
    Get current loaded model. Raise if not loaded.
    Used by predictions.py
    """
    if not _is_loaded or _model is None:
        raise RuntimeError("Model is not loaded")
    return _model


def get_config() -> Dict[str, Any]:
    """
    Return config dict used by predictions.py
    Must contain at least 'device' and 'image_size'.
    """
    return _config


def get_current_model_info() -> Dict[str, Any]:
    """
    Info used by /models/active endpoint.
    """
    return {
        "is_loaded": _is_loaded,
        "model_name": _current_model_name,
        "active_model": _current_model_name,  # Added for compatibility
        "device": _config.get("device"),
    }
