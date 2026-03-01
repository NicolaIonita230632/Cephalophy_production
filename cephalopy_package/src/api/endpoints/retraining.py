"""
Retraining endpoints
"""

import logging

from fastapi import APIRouter, HTTPException

from api.core.retraining_service import get_retraining_service
from api.schemas.retraining import (
    DataValidationResponse,
    RetrainingHistoryItem,
    RetrainingHistoryResponse,
    RetrainingJobStatus,
    RetrainTriggerRequest,
    RetrainTriggerResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/retrain/validate", response_model=DataValidationResponse)
async def validate_data():
    """
    Check if enough data is available for retraining

    This endpoint checks:
    - Number of new images in GCS
    - Number of corrected annotations
    - Whether minimum threshold is met
    """
    try:
        service = get_retraining_service()
        result = service.validate_data_availability()
        return DataValidationResponse(**result)
    except Exception as e:
        logger.error(f"Data validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retrain/trigger", response_model=RetrainTriggerResponse)
async def trigger_retraining(request: RetrainTriggerRequest):
    """
    Trigger a new retraining job

    This endpoint:
    - Validates data availability (unless force=True)
    - Creates a new retraining job
    - Runs retraining in background thread
    - Returns job ID for status tracking

    Parameters:
    - force: Skip data validation check
    - epochs: Override default number of epochs
    - learning_rate: Override default learning rate
    - batch_size: Override default batch size
    """
    try:
        service = get_retraining_service()
        result = service.trigger_retraining(
            force=request.force,
            epochs=request.epochs,
            learning_rate=request.learning_rate,
            batch_size=request.batch_size,
        )
        return RetrainTriggerResponse(**result)
    except ValueError as e:
        # Validation error (not enough data) - return 400
        logger.warning(f"Retraining validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected error - return 500
        logger.error(f"Failed to trigger retraining: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retrain/status/{job_id}", response_model=RetrainingJobStatus)
async def get_job_status(job_id: str):
    """
    Get the status of a retraining job

    Returns:
    - Current status (pending, training, completed, failed, etc.)
    - Progress percentage
    - Current step description
    - Metrics (if completed)
    - Error message (if failed)
    """
    try:
        service = get_retraining_service()
        job_status = service.get_job_status(job_id)

        if not job_status:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        return RetrainingJobStatus(**job_status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retrain/history", response_model=RetrainingHistoryResponse)
async def get_retraining_history(limit: int = 10):
    """
    Get history of recent retraining jobs

    Parameters:
    - limit: Maximum number of jobs to return (default: 10)

    Returns list of recent retraining jobs with:
    - Job ID
    - Status
    - Start/completion times
    - Number of images processed
    - Success/failure status
    """
    try:
        service = get_retraining_service()
        jobs = service.get_job_history(limit=limit)

        history_items = []
        for job in jobs:
            history_items.append(
                RetrainingHistoryItem(
                    job_id=job["job_id"],
                    status=job["status"],
                    started_at=job["started_at"],
                    completed_at=job.get("completed_at"),
                    duration_seconds=job.get("duration_seconds"),
                    num_images_processed=job.get("num_images_processed"),
                    success=job["status"] == "completed",
                    error_message=job.get("error_message"),
                )
            )

        return RetrainingHistoryResponse(
            total_jobs=len(history_items), jobs=history_items
        )
    except Exception as e:
        logger.error(f"Failed to get retraining history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
