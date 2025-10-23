# Detection Pydantic schemas

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class DetectionBase(BaseModel):
    """Schema base for Detection model"""
    camera_id: int
    frame_id: Optional[int] = None  # Frame ID for synchronization
    timestamp: Optional[float] = None  # Unix timestamp for sync
    detections: List[dict] # [{"bbox": [x, y, w, h], "confidence": float, "class_name": str}, ...]

class DetectionResponse(BaseModel):
    id: int
    camera_id: int
    bbox: List[float]  # [x, y, w, h]
    confidence: float
    class_name: str
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }
