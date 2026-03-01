"""Pydantic schemas for API"""

from typing import List, Optional

from pydantic import BaseModel, Field


class LandmarkPoint(BaseModel):
    x: float
    y: float


class Landmark(BaseModel):
    title: str
    symbol: str
    value: LandmarkPoint


class PredictionOutput(BaseModel):
    ceph_id: str
    landmarks: List[Landmark]
    dataset_name: str = "Uploaded Data"
    processing_time: Optional[float] = None
    model_version: Optional[str] = None


class PredictionInput(BaseModel):
    image: str = Field(..., description="Base64 encoded image")
    ceph_id: Optional[str] = Field(None, description="Optional ID for the cephalogram")
