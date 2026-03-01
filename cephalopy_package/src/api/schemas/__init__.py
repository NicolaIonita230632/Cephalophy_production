"""
Pydantic schemas for API requests and responses
"""

# Import from your existing prediction schema
from api.schemas.prediction import (
    Landmark,
    LandmarkPoint,
    PredictionInput,
    PredictionOutput,
)

# Import retraining schemas (NEW)
from api.schemas.retraining import (
    DataValidationResponse,
    RetrainingHistoryItem,
    RetrainingHistoryResponse,
    RetrainingJobStatus,
    RetrainingMetrics,
    RetrainingStatus,
    RetrainTriggerRequest,
    RetrainTriggerResponse,
)

__all__ = [
    # Prediction schemas (your existing ones)
    "Landmark",
    "LandmarkPoint",
    "PredictionInput",
    "PredictionOutput",
    # Retraining schemas (NEW)
    "RetrainingStatus",
    "RetrainTriggerRequest",
    "RetrainTriggerResponse",
    "DataValidationResponse",
    "RetrainingMetrics",
    "RetrainingJobStatus",
    "RetrainingHistoryItem",
    "RetrainingHistoryResponse",
]
