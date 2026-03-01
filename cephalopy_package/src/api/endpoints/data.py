"""
Data management endpoints - Save annotations to GCS with clear 3-folder structure
"""

import json
import logging
import os
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from google.cloud import storage
from google.oauth2 import service_account
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

BUCKET_NAME = "deepfuse-models-230632"
INFERENCE_IMAGES_FOLDER = "data/inference_images/"
MODEL_PREDICTIONS_FOLDER = "data/model_predictions/"
CORRECTED_ANNOTATIONS_FOLDER = "data/corrected_annotations/"


def get_storage_client():
    """Initialize Google Cloud Storage client from environment variables"""
    # First try GOOGLE_APPLICATION_CREDENTIALS path
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

    if credentials_path and os.path.exists(credentials_path):
        logger.info(f"[data] Using credentials from: {credentials_path}")
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
        logger.info("[data] Using credentials from environment variables")
        credentials = service_account.Credentials.from_service_account_info(
            credentials_dict
        )
        return storage.Client(
            credentials=credentials, project=credentials_dict["project_id"]
        )

    # Last resort - try default credentials
    logger.warning(
        "[data] No credentials found in environment, trying default credentials"
    )
    return storage.Client()


class SaveAnnotationResponse(BaseModel):
    """Response after saving annotation"""

    filename: str
    image_number: int
    total_images: int
    was_corrected: bool  # True if user made changes, False if approved as-is
    message: str


@router.post("/data/save-annotation", response_model=SaveAnnotationResponse)
async def save_annotation(
    file: UploadFile = File(...),
    model_prediction: str = Form(...),  # Original model prediction
    final_annotation: str = Form(...),  # Final version (could be same or edited)
    was_corrected: bool = Form(False),  # Did user make corrections?
    ceph_id: str = Form(None),
):
    """
    Save annotation to GCS with clear 3-folder structure

    ALWAYS saves to all 3 folders:
    1. data/inference_images/          - The X-ray image
    2. data/model_predictions/         - Model's ORIGINAL prediction (for research)
    3. data/corrected_annotations/     - FINAL annotation (corrected or approved)

    User flow:
    - If approved as-is: model_prediction == final_annotation
    - If corrected: model_prediction ≠ final_annotation

    Args:
        file: X-ray image file
        model_prediction: JSON string of model's original prediction
        final_annotation: JSON string of final annotation (corrected or not)
        was_corrected: Boolean indicating if user made changes
        ceph_id: Optional unique identifier

    Returns:
        SaveAnnotationResponse with progress toward 50 images
    """
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        # Count existing images to get next number
        existing_images = list(bucket.list_blobs(prefix=INFERENCE_IMAGES_FOLDER))
        existing_images = [
            b
            for b in existing_images
            if not b.name.endswith("/")
            and b.name.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))
        ]

        next_number = len(existing_images) + 1
        filename = f"patient_{next_number:03d}"

        # Get file extension
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
        image_filename = f"{filename}.{file_ext}"
        json_filename = f"{filename}.json"

        # Read image data
        image_data = await file.read()

        # ==================================================================
        # 1. SAVE IMAGE to data/inference_images/
        # ==================================================================
        image_blob = bucket.blob(f"{INFERENCE_IMAGES_FOLDER}{image_filename}")
        image_blob.upload_from_string(image_data, content_type=file.content_type)
        logger.info(f"✓ Saved X-ray: {INFERENCE_IMAGES_FOLDER}{image_filename}")

        # ==================================================================
        # 2. SAVE MODEL PREDICTION to data/model_predictions/
        # ==================================================================
        model_data = json.loads(model_prediction)

        # Add metadata to model prediction
        model_data["ceph_id"] = ceph_id
        model_data["predicted_at"] = datetime.utcnow().isoformat()
        model_data["filename"] = filename
        model_data["type"] = "original_model_prediction"

        prediction_blob = bucket.blob(f"{MODEL_PREDICTIONS_FOLDER}{json_filename}")
        prediction_blob.upload_from_string(
            json.dumps(model_data, indent=2), content_type="application/json"
        )
        logger.info(
            f"✓ Saved model prediction: {MODEL_PREDICTIONS_FOLDER}{json_filename}"
        )

        # ==================================================================
        # 3. SAVE FINAL ANNOTATION to data/corrected_annotations/
        # ==================================================================
        final_data = json.loads(final_annotation)

        # Add metadata to final annotation
        final_data["ceph_id"] = ceph_id
        final_data["saved_at"] = datetime.utcnow().isoformat()
        final_data["filename"] = filename
        final_data["was_corrected"] = was_corrected
        final_data["type"] = (
            "corrected_by_user" if was_corrected else "approved_without_correction"
        )

        annotation_blob = bucket.blob(f"{CORRECTED_ANNOTATIONS_FOLDER}{json_filename}")
        annotation_blob.upload_from_string(
            json.dumps(final_data, indent=2), content_type="application/json"
        )
        logger.info(
            f"✓ Saved final annotation: {CORRECTED_ANNOTATIONS_FOLDER}{json_filename}"
        )

        # ==================================================================
        # SUCCESS RESPONSE
        # ==================================================================
        status = "with corrections" if was_corrected else "without corrections"

        return SaveAnnotationResponse(
            filename=filename,
            image_number=next_number,
            total_images=next_number,
            was_corrected=was_corrected,
            message=f"Saved {filename} {status} ({next_number}/50 images collected)",
        )

    except Exception as e:
        logger.error(f"Failed to save annotation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/count")
async def get_data_count():
    """
    Get current count of collected images

    Returns:
        Dict with current count and status
    """
    try:
        client = get_storage_client()
        bucket = client.bucket(BUCKET_NAME)

        existing_images = list(bucket.list_blobs(prefix=INFERENCE_IMAGES_FOLDER))
        count = len([
            b
            for b in existing_images
            if not b.name.endswith("/")
            and b.name.lower().endswith((".png", ".jpg", ".jpeg", ".bmp"))
        ])

        return {
            "count": count,
            "threshold": 50,
            "ready_for_training": count >= 50,
            "message": f"{count}/50 images collected",
        }

    except Exception as e:
        logger.error(f"Failed to get data count: {e}")
        raise HTTPException(status_code=500, detail=str(e))
