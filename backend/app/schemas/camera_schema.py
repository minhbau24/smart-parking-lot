# Camera Pydantic schemas

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: Optional[str] = None
    stream_url: Optional[str] = None
    source_type: Optional[str] = "webcam"  # webcam, rtsp, file, http
    homography_matrix: Optional[List[List[float]]] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    source_type: Optional[str] = None
    homography_matrix: Optional[List[List[float]]] = None
    status: Optional[str] = None

class CameraResponse(CameraBase):
    id: int
    status: str
    source_type: Optional[str] = "webcam"  # Allow None for old cameras
    created_at: datetime

    model_config = {
        "from_attributes": True
    }