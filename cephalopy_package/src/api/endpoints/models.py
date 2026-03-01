"""
Model management endpoints and retraining logic.
"""

import json
import logging
import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from google.cloud import storage
from google.oauth2 import service_account
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

BUCKET_NAME = "deepfuse-models-230632"


def get_storage_client():
    """Create a Google Cloud Storage client from environment credentials."""
    # First try GOOGLE_APPLICATION_CREDENTIALS path
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if credentials_path and os.path.exists(credentials_path):
        logger.info(f"[models] Using credentials from: {credentials_path}")
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
            "GCP_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"
        ),
        "token_uri": os.getenv("GCP_TOKEN_URI", "https://oauth2.googleapis.com/token"),
        "auth_provider_x509_cert_url": os.getenv(
            "GCP_AUTH_PROVIDER_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"
        ),
        "client_x509_cert_url": os.getenv("GCP_CLIENT_CERT_URL"),
    }

    # Check if we have the minimum required fields
    if (
        credentials_dict["project_id"]
        and credentials_dict["private_key"]
        and credentials_dict["client_email"]
    ):
        logger.info("[models] Using credentials from environment variables")
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict
        )
        return storage.Client(
            credentials=credentials, project=credentials_dict["project_id"]
        )

    # Last resort - try default credentials
    logger.warning(
        "[models] No credentials found in environment, trying default credentials"
    )
    return storage.Client()


class ModelMetrics(BaseModel):
    """Basic performance metrics for a model."""

    mre: float | None = None
    sdr_2mm: float | None = None
    sdr_2_5mm: float | None = None
    sdr_3mm: float | None = None
    sdr_4mm: float | None = None


class ModelInfo(BaseModel):
    """Metadata and metrics for a single model version."""

    id: str
    name: str
    version: str
    date: str
    status: str
    size_mb: float | None = None
    metrics: ModelMetrics | None = None
    is_production: bool


class ModelsListResponse(BaseModel):
    """Response model for a list of models."""

    total: int
    models: list[ModelInfo]


class CompareModelsRequest(BaseModel):
    """Request body for clinical model comparison."""

    model_ids: List[str]


@router.get("/models/list", response_model=ModelsListResponse)
async def list_models():
    """Return all model versions stored in GCS."""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        models = []

        # Get active model info
        active_blob = bucket.blob("models/production/active_model.json")
        active_model_name = None
        if active_blob.exists():
            active_config = json.loads(active_blob.download_as_text())
            active_model_name = active_config.get("active_model")

        # Production models - list all .pth files in production folder
        prod_blobs = list(bucket.list_blobs(prefix="models/production/"))
        prod_blobs = [b for b in prod_blobs if b.name.endswith(".pth")]

        for prod_blob in prod_blobs:
            if prod_blob.exists():
                filename = prod_blob.name.split("/")[-1]
                model_name = filename.replace(".pth", "")

                # Check if this is the active model
                is_active = model_name == active_model_name

                # Look for model-specific metadata file
                metadata_path = f"models/production/{model_name}_metadata.json"
                metadata_blob = bucket.blob(metadata_path)
                metadata = {}

                if metadata_blob.exists():
                    try:
                        metadata = json.loads(metadata_blob.download_as_text())
                    except Exception as e:
                        logger.warning(f"Failed to load metadata for {model_name}: {e}")

                # Extract metrics from metadata if available
                metrics_data = metadata.get("metrics", {})
                metrics = None
                if metrics_data:
                    metrics = ModelMetrics(
                        mre=metrics_data.get("mre"),
                        sdr_2mm=metrics_data.get("sdr_2mm"),
                        sdr_2_5mm=metrics_data.get("sdr_2_5mm"),
                        sdr_3mm=metrics_data.get("sdr_3mm"),
                        sdr_4mm=metrics_data.get("sdr_4mm"),
                    )

                models.append(
                    ModelInfo(
                        id=f"production_{model_name}",
                        name=model_name,
                        version=metadata.get("version", "v1.0"),
                        date=metadata.get(
                            "retrain_date",
                            prod_blob.time_created.strftime("%Y-%m-%d")
                            if prod_blob.time_created
                            else "Unknown",
                        ),
                        status="active" if is_active else "inactive",
                        size_mb=(
                            round(prod_blob.size / (1024 * 1024), 1)
                            if prod_blob.size
                            else None
                        ),
                        metrics=metrics,
                        is_production=True,
                    )
                )

        # Backup models
        version_blobs = list(bucket.list_blobs(prefix="models/versions/"))
        version_blobs = [b for b in version_blobs if b.name.endswith(".pth")]

        for i, blob in enumerate(
            sorted(version_blobs, key=lambda x: x.time_created, reverse=True)[:10]
        ):
            filename = blob.name.split("/")[-1]
            version_str = filename.replace("backup_", "").replace(".pth", "")

            models.append(
                ModelInfo(
                    id=f"version_{i + 1}",
                    name=f"Backup {i + 1}",
                    version=version_str,
                    date=(
                        blob.time_created.strftime("%Y-%m-%d")
                        if blob.time_created
                        else "Unknown"
                    ),
                    status="inactive",
                    size_mb=(
                        round(blob.size / (1024 * 1024), 1) if blob.size else None
                    ),
                    metrics=None,
                    is_production=False,
                )
            )

        return ModelsListResponse(total=len(models), models=models)

    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/activate")
async def activate_model(model_id: str):
    """Set a model as the active production model"""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        if not model_id.startswith("production_"):
            raise HTTPException(
                status_code=400, detail="Only production models can be activated"
            )

        model_name = model_id.replace("production_", "")

        # Check if model exists
        model_blob = bucket.blob(f"models/production/{model_name}.pth")
        if not model_blob.exists():
            raise HTTPException(status_code=404, detail="Model not found")

        # Update active model reference
        active_config = {
            "active_model": model_name,
            "updated_at": datetime.utcnow().isoformat(),
        }

        active_blob = bucket.blob("models/production/active_model.json")
        active_blob.upload_from_string(json.dumps(active_config, indent=2))

        # Reload the model in the backend
        from api.core.dependencies import reload_model

        reload_model()

        return {
            "message": f"Model {model_name} is now active and loaded",
            "active_model": model_name,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to activate model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/active")
async def get_active_model():
    """Get the currently active model"""
    try:
        from api.core.dependencies import get_current_model_info

        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)
        active_blob = bucket.blob("models/production/active_model.json")

        if active_blob.exists():
            active_config = json.loads(active_blob.download_as_text())
            model_info = get_current_model_info()

            return {
                "active_model": active_config.get("active_model"),
                "updated_at": active_config.get("updated_at"),
                "is_loaded": model_info["is_loaded"],
            }
        else:
            return {"active_model": None, "message": "No active model configured"}

    except Exception as e:
        logger.error(f"Failed to get active model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}")
async def get_model_details(model_id: str):
    """Get detailed information about a specific model"""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        if model_id.startswith("production_"):
            model_name = model_id.replace("production_", "")

            # Get model-specific metadata
            metadata_blob = bucket.blob(f"models/production/{model_name}_metadata.json")

            if metadata_blob.exists():
                metadata = json.loads(metadata_blob.download_as_text())

                return {
                    "id": model_id,
                    "name": model_name,
                    "version": metadata.get("version", "v1.0"),
                    "architecture": metadata.get("architecture", "Unknown"),
                    "metrics": metadata.get("metrics", {}),
                    "training_info": metadata.get("training_info", {}),
                    "retrain_date": metadata.get("retrain_date", "Unknown"),
                }
            else:
                # Return minimal info if no metadata exists
                return {
                    "id": model_id,
                    "name": model_name,
                    "version": "v1.0",
                    "metrics": {},
                    "message": "No metadata available for this model",
                }
        else:
            raise HTTPException(status_code=404, detail="Model not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/new")
async def check_new_models():
    """Check if there are newly trained models that haven't been reviewed"""
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        # Get all production models
        prod_blobs = list(bucket.list_blobs(prefix="models/production/"))
        prod_blobs = [b for b in prod_blobs if b.name.endswith(".pth")]

        # Get active model
        active_blob = bucket.blob("models/production/active_model.json")
        active_model_name = None
        if active_blob.exists():
            active_config = json.loads(active_blob.download_as_text())
            active_model_name = active_config.get("active_model")

        new_models = []
        for blob in prod_blobs:
            filename = blob.name.split("/")[-1]
            model_name = filename.replace(".pth", "")

            # Check if this is a retrained model (starts with "retrained_")
            if model_name.startswith("retrained_") and model_name != active_model_name:
                # Get metadata
                metadata_path = f"models/production/{model_name}_metadata.json"
                metadata_blob = bucket.blob(metadata_path)
                if metadata_blob.exists():
                    metadata = json.loads(metadata_blob.download_as_text())
                    new_models.append({
                        "name": model_name,
                        "created_at": metadata.get("retrain_date"),
                        "metrics": metadata.get("metrics", {}),
                    })

        return {
            "has_new_models": len(new_models) > 0,
            "count": len(new_models),
            "models": sorted(
                new_models, key=lambda x: x.get("created_at", ""), reverse=True
            ),
        }

    except Exception as e:
        logger.error(f"Failed to check new models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to initialize storage client: {e}")
        raise


# Helper functions for clinical comparison
def get_accuracy_interpretation(mre: float) -> dict:
    """Return a clinical interpretation of accuracy from MRE."""
    if mre < 1.5:
        return {
            "level": "Excellent",
            "color": "green",
            "description": (
                "Clinically acceptable for most orthodontic applications. "
                "Errors are minimal and unlikely to affect planning."
            ),
        }
    elif mre < 2.0:
        return {
            "level": "Good",
            "color": "blue",
            "description": (
                "Generally acceptable for clinical use. "
                "Verify critical landmarks in complex cases."
            ),
        }
    elif mre < 3.0:
        return {
            "level": "Fair",
            "color": "orange",
            "description": (
                "Borderline clinical utility. Predictions should be "
                "reviewed before treatment planning."
            ),
        }
    else:
        return {
            "level": "Poor",
            "color": "red",
            "description": (
                "Not recommended for clinical use without manual "
                "correction due to high error risk."
            ),
        }


def get_reliability_interpretation(sdr_2mm: float) -> dict:
    """Return a clinical interpretation of reliability from SDR@2mm."""
    if sdr_2mm >= 85:
        return {
            "level": "Excellent",
            "color": "green",
            "description": (
                "High reliability with most landmarks within a "
                "clinically acceptable tolerance."
            ),
        }
    elif sdr_2mm >= 75:
        return {
            "level": "Good",
            "color": "blue",
            "description": (
                "Acceptable reliability for clinical use with "
                "verification of predictions."
            ),
        }
    elif sdr_2mm >= 60:
        return {
            "level": "Fair",
            "color": "orange",
            "description": (
                "Limited reliability; requires careful manual review of predictions."
            ),
        }
    else:
        return {
            "level": "Poor",
            "color": "red",
            "description": (
                "Insufficient reliability for clinical use. "
                "Manual landmark placement is recommended."
            ),
        }


def analyze_winners(model_a: dict, model_b: dict) -> dict:
    """Determine which model wins for each metric."""
    return {
        "accuracy": {
            "winner": "model_a"
            if model_a["metrics"]["mre"] < model_b["metrics"]["mre"]
            else "model_b",
            "winner_name": model_a["name"]
            if model_a["metrics"]["mre"] < model_b["metrics"]["mre"]
            else model_b["name"],
            "difference": abs(model_a["metrics"]["mre"] - model_b["metrics"]["mre"]),
            "clinical_significance": get_mre_difference_significance(
                abs(model_a["metrics"]["mre"] - model_b["metrics"]["mre"])
            ),
        },
        "reliability_2mm": {
            "winner": "model_a"
            if model_a["metrics"]["sdr_2mm"] > model_b["metrics"]["sdr_2mm"]
            else "model_b",
            "winner_name": model_a["name"]
            if model_a["metrics"]["sdr_2mm"] > model_b["metrics"]["sdr_2mm"]
            else model_b["name"],
            "difference": abs(
                model_a["metrics"]["sdr_2mm"] - model_b["metrics"]["sdr_2mm"]
            ),
            "landmark_difference": abs(
                model_a["successful_landmarks"]["2mm"]
                - model_b["successful_landmarks"]["2mm"]
            ),
        },
        "reliability_2_5mm": {
            "winner": "model_a"
            if model_a["metrics"]["sdr_2_5mm"] > model_b["metrics"]["sdr_2_5mm"]
            else "model_b",
            "winner_name": model_a["name"]
            if model_a["metrics"]["sdr_2_5mm"] > model_b["metrics"]["sdr_2_5mm"]
            else model_b["name"],
        },
        "reliability_3mm": {
            "winner": "model_a"
            if model_a["metrics"]["sdr_3mm"] > model_b["metrics"]["sdr_3mm"]
            else "model_b",
            "winner_name": model_a["name"]
            if model_a["metrics"]["sdr_3mm"] > model_b["metrics"]["sdr_3mm"]
            else model_b["name"],
        },
        "reliability_4mm": {
            "winner": "model_a"
            if model_a["metrics"]["sdr_4mm"] > model_b["metrics"]["sdr_4mm"]
            else "model_b",
            "winner_name": model_a["name"]
            if model_a["metrics"]["sdr_4mm"] > model_b["metrics"]["sdr_4mm"]
            else model_b["name"],
        },
    }


def get_mre_difference_significance(difference: float) -> str:
    """Summarize how clinically important an MRE difference is."""
    if difference < 0.5:
        return "Minimal difference; both models perform similarly."
    elif difference < 1.0:
        return "Moderate difference that may be noticeable in practice."
    else:
        return "Significant difference with a clear performance advantage."


def generate_clinical_recommendation(
    model_a: dict, model_b: dict, winner_analysis: dict
) -> dict:
    """Generate an overall clinical recommendation for two models."""
    # Count wins
    wins_a = sum(
        1 for metric in winner_analysis.values() if metric.get("winner") == "model_a"
    )
    wins_b = sum(
        1 for metric in winner_analysis.values() if metric.get("winner") == "model_b"
    )

    # Determine overall better model
    if wins_a > wins_b:
        recommended = model_a
        other = model_b
    elif wins_b > wins_a:
        recommended = model_b
        other = model_a
    else:
        # Tie - use MRE as tiebreaker (lower is better)
        if model_a["metrics"]["mre"] < model_b["metrics"]["mre"]:
            recommended = model_a
            other = model_b
        else:
            recommended = model_b
            other = model_a

    # Build recommendation text
    recommendation_text = f"{recommended['name']} is recommended for clinical use"

    # Add reasoning
    reasoning = []
    if winner_analysis["accuracy"]["winner"] == "model_a" and recommended == model_a:
        reasoning.append(
            f"Superior accuracy (MRE: {recommended['metrics']['mre']}mm "
            f"vs {other['metrics']['mre']}mm)"
        )
    elif winner_analysis["accuracy"]["winner"] == "model_b" and recommended == model_b:
        reasoning.append(
            f"Superior accuracy (MRE: {recommended['metrics']['mre']}mm "
            f"vs {other['metrics']['mre']}mm)"
        )

    if (
        winner_analysis["reliability_2mm"]["winner"] == "model_a"
        and recommended == model_a
    ):
        reasoning.append(
            "Better reliability "
            f"({recommended['successful_landmarks']['2mm']} vs "
            f"{other['successful_landmarks']['2mm']} landmarks within 2mm)"
        )
    elif (
        winner_analysis["reliability_2mm"]["winner"] == "model_b"
        and recommended == model_b
    ):
        reasoning.append(
            "Better reliability "
            f"({recommended['successful_landmarks']['2mm']} vs "
            f"{other['successful_landmarks']['2mm']} landmarks within 2mm)"
        )

    return {
        "recommended_model": recommended["id"],
        "recommended_model_name": recommended["name"],
        "summary": recommendation_text,
        "reasoning": reasoning,
        "confidence": "High"
        if abs(wins_a - wins_b) >= 3
        else "Moderate"
        if abs(wins_a - wins_b) >= 1
        else "Low",
    }


@router.post("/models/compare/clinical")
async def compare_models_clinical(request: CompareModelsRequest):
    """Compare two models with clinical metrics and explanations."""
    try:
        model_ids = request.model_ids

        if len(model_ids) != 2:
            raise HTTPException(
                status_code=400,
                detail="Exactly 2 models are required for clinical comparison",
            )

        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        TOTAL_LANDMARKS = 19
        comparison_data = []

        for model_id in model_ids:
            logger.info(f"Processing model_id: {model_id}")

            # Handle production vs backup models
            if model_id.startswith("production_"):
                model_name = model_id.replace("production_", "")
                model_path = f"models/production/{model_name}.pth"

                # Try different metadata path patterns
                metadata_paths = [
                    f"models/production/{model_name}_metadata.json",
                    "models/production/metadata.json",
                ]

                metadata_blob = None
                metadata_path = None
                for path in metadata_paths:
                    test_blob = bucket.blob(path)
                    if test_blob.exists():
                        metadata_blob = test_blob
                        metadata_path = path
                        break

                if not metadata_blob:
                    logger.error(f"Tried paths: {metadata_paths}")
                    raise HTTPException(
                        status_code=404,
                        detail=f"Metadata not found for model: {model_id}",
                    )

            elif model_id.startswith("backup_"):
                model_name = model_id.replace("backup_", "")
                model_path = f"models/backups/{model_name}.pth"
                metadata_path = f"models/backups/{model_name}_metadata.json"
                metadata_blob = bucket.blob(metadata_path)
            else:
                raise HTTPException(
                    status_code=400, detail=f"Invalid model ID format: {model_id}"
                )

            # Check if model exists
            model_blob = bucket.blob(model_path)
            if not model_blob.exists():
                raise HTTPException(
                    status_code=404, detail=f"Model file not found: {model_path}"
                )

            # Get metadata
            if not metadata_blob.exists():
                raise HTTPException(
                    status_code=404, detail=f"Metadata file not found: {metadata_path}"
                )

            metadata = json.loads(metadata_blob.download_as_text())
            logger.info(f"Loaded metadata for {model_name}")

            # Get model size
            model_blob.reload()
            size_mb = (model_blob.size or 0) / (1024 * 1024)

            # Extract metrics
            metrics = metadata.get("metrics", {})

            if not metrics:
                raise HTTPException(
                    status_code=404,
                    detail=f"No metrics found in metadata for model: {model_id}",
                )

            mre = metrics.get("mean_radial_error") or metrics.get("mre", 0)
            sdr_2mm = metrics.get("sdr_2mm", 0)
            sdr_2_5mm = metrics.get("sdr_2.5mm") or metrics.get("sdr_2_5mm", 0)
            sdr_3mm = metrics.get("sdr_3mm", 0)
            sdr_4mm = metrics.get("sdr_4mm", 0)

            # Calculate successful landmark counts
            successful_landmarks = {
                "2mm": round((sdr_2mm / 100) * TOTAL_LANDMARKS),
                "2_5mm": round((sdr_2_5mm / 100) * TOTAL_LANDMARKS),
                "3mm": round((sdr_3mm / 100) * TOTAL_LANDMARKS),
                "4mm": round((sdr_4mm / 100) * TOTAL_LANDMARKS),
            }

            # Get clinical interpretations
            accuracy_interpretation = get_accuracy_interpretation(mre)
            reliability_interpretation = get_reliability_interpretation(sdr_2mm)

            model_data = {
                "id": model_id,
                "name": model_name,
                "architecture": metadata.get("architecture", "Unknown"),
                "version": metadata.get("version", "1.0"),
                "date": metadata.get("upload_date")
                or metadata.get("retrain_date", "Unknown"),
                "size_mb": round(size_mb, 2),
                "metrics": {
                    "mre": round(mre, 3),
                    "sdr_2mm": round(sdr_2mm, 1),
                    "sdr_2_5mm": round(sdr_2_5mm, 1),
                    "sdr_3mm": round(sdr_3mm, 1),
                    "sdr_4mm": round(sdr_4mm, 1),
                },
                "successful_landmarks": successful_landmarks,
                "clinical_interpretation": {
                    "accuracy": accuracy_interpretation,
                    "reliability": reliability_interpretation,
                },
                "dataset_info": {
                    "train_images": metadata.get("dataset", {}).get("train_images", 0),
                    "val_images": metadata.get("dataset", {}).get("val_images", 0),
                    "test_images": metadata.get("dataset", {}).get("test_images", 0),
                },
            }

            comparison_data.append(model_data)

        # Determine which model is better for each metric
        winner_analysis = analyze_winners(comparison_data[0], comparison_data[1])

        # Generate recommendation
        recommendation = generate_clinical_recommendation(
            comparison_data[0], comparison_data[1], winner_analysis
        )

        return {
            "models": comparison_data,
            "winner_analysis": winner_analysis,
            "recommendation": recommendation,
            "total_landmarks": TOTAL_LANDMARKS,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compare models clinically: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
