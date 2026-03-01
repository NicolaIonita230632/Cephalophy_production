"""Prediction endpoints"""

import io
import logging
import time
import uuid
from typing import Optional

import torch
import torch.nn.functional as F
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image

from api.core.dependencies import get_config, get_model
from api.core.preprocessing import (
    heatmaps_to_landmarks,
    image_to_tensor,
)
from api.schemas.prediction import PredictionOutput

logger = logging.getLogger(__name__)
router = APIRouter()


def predict_landmarks(image: Image.Image, model, config) -> dict:
    """Run the model prediction on an image"""
    original_size = image.size
    # Resize the images
    image_resized = image.resize(
        (config["image_size"][1], config["image_size"][0]), Image.BILINEAR
    )
    image_tensor = image_to_tensor(image_resized)

    device = torch.device(config["device"])
    with torch.no_grad():
        image_tensor = image_tensor.to(device)
        heatmaps = model(image_tensor)

        if heatmaps.shape[-2:] != (128, 128):
            heatmaps = F.interpolate(
                heatmaps, size=(128, 128), mode="bilinear", align_corners=False
            )

    landmarks, confidences = heatmaps_to_landmarks(heatmaps, original_size, 0, 0)

    return {
        "landmarks": landmarks,
        "confidences": confidences,
        "original_size": original_size,
    }


@router.post("/predict", response_model=PredictionOutput)
async def predict_from_file(
    file: UploadFile = File(...), ceph_id: Optional[str] = Form(None)
):
    """
    Predict landmarks from an uploaded image file

    NOTE: Does NOT save to GCS automatically.
    User must explicitly click "Save" or "Correct + Save" to store data.

    Args:
        file: Uploaded X-ray image file
        ceph_id: Optional unique identifier
    """
    start_time = time.time()

    try:
        model = get_model()
        config = get_config()

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        if ceph_id is None:
            ceph_id = str(uuid.uuid4())

        result = predict_landmarks(image, model, config)
        processing_time = time.time() - start_time

        return PredictionOutput(
            ceph_id=ceph_id,
            landmarks=result["landmarks"],
            processing_time=processing_time,
            model_version="1.0.0",
        )

    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
