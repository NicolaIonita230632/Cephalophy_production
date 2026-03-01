"""Health endpoints"""

import logging

from fastapi import APIRouter

from api.core.dependencies import get_config, get_current_model_info

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Reports:
    - Whether the model is loaded
    - Which device is used (cpu/cuda)
    - Model name (active model)
    - Image size expected by the model
    """
    config = get_config()
    model_info = get_current_model_info()

    status = "ok" if model_info.get("is_loaded") else "degraded"

    return {
        "status": status,
        "model_loaded": model_info.get("is_loaded"),
        "model_name": model_info.get("model_name"),
        "device": config.get("device"),
        "image_size": config.get("image_size"),
    }
