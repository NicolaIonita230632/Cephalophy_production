"""
Pydantic schemas for retraining endpoints
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RetrainingStatus(str, Enum):
    """Retraining job status"""

    PENDING = "pending"
    CHECKING_DATA = "checking_data"
    DOWNLOADING = "downloading"
    TRAINING = "training"
    UPLOADING = "uploading"
    ARCHIVING = "archiving"
    COMPLETED = "completed"
    FAILED = "failed"


class RetrainTriggerRequest(BaseModel):
    """Request model for triggering retraining"""

    force: bool = Field(
        default=False,
        description="Force retraining even if minimum data threshold not met",
    )
    epochs: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
        description="Number of fine-tuning epochs (overrides default)",
    )
    learning_rate: Optional[float] = Field(
        default=None,
        gt=0,
        lt=1,
        description="Learning rate for fine-tuning (overrides default)",
    )
    batch_size: Optional[int] = Field(
        default=None,
        ge=1,
        le=32,
        description="Training batch size (overrides default)",
    )


class RetrainTriggerResponse(BaseModel):
    """Response model after triggering retraining"""

    job_id: Optional[str] = Field(None, description="Unique job identifier")
    status: str = Field(..., description="Current job status")
    message: str = Field(..., description="Human-readable status message")
    estimated_duration_minutes: Optional[int] = Field(
        None, description="Estimated time to complete"
    )


class DataValidationResponse(BaseModel):
    """Response model for data validation check"""

    ready_for_retraining: bool = Field(
        ..., description="Whether enough data is available"
    )
    num_images: int = Field(..., description="Number of new images found")
    num_annotations: int = Field(..., description="Number of annotations found")
    min_required: int = Field(..., description="Minimum images required")
    matched_pairs: int = Field(
        ..., description="Number of image-annotation pairs matched"
    )
    message: str = Field(..., description="Status message")


class RetrainingMetrics(BaseModel):
    """Training metrics from retraining job"""

    final_loss: float = Field(..., description="Final training loss")
    epochs_completed: int = Field(..., description="Number of epochs completed")
    training_history: List[float] = Field(
        default_factory=list, description="Loss values per epoch"
    )
    samples_processed: int = Field(..., description="Number of training samples")


class RetrainingJobStatus(BaseModel):
    """Detailed status of a retraining job"""

    job_id: str = Field(..., description="Unique job identifier")
    status: RetrainingStatus = Field(..., description="Current job status")
    progress_percentage: Optional[int] = Field(
        None, ge=0, le=100, description="Progress percentage"
    )
    started_at: Optional[datetime] = Field(None, description="Job start time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")
    duration_seconds: Optional[float] = Field(None, description="Total duration")

    # Training details
    num_images_processed: Optional[int] = Field(
        None, description="Number of images processed"
    )
    num_annotations_processed: Optional[int] = Field(
        None, description="Number of annotations processed"
    )

    # Model details
    backup_model_path: Optional[str] = Field(
        None, description="Path to backed up model"
    )
    new_model_path: Optional[str] = Field(
        None, description="Path to new production model"
    )

    # Results
    metrics: Optional[RetrainingMetrics] = Field(
        None, description="Training metrics if completed"
    )

    # Error handling
    error_message: Optional[str] = Field(None, description="Error message if failed")

    # Current step
    current_step: Optional[str] = Field(
        None, description="Description of current processing step"
    )


class RetrainingHistoryItem(BaseModel):
    """Summary of a past retraining job"""

    job_id: str
    status: RetrainingStatus
    started_at: datetime
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    num_images_processed: Optional[int]
    success: bool
    error_message: Optional[str]


class RetrainingHistoryResponse(BaseModel):
    """Response model for retraining history"""

    total_jobs: int = Field(..., description="Total number of retraining jobs")
    jobs: List[RetrainingHistoryItem] = Field(
        ..., description="List of retraining jobs"
    )
