# Slot Pydantic schemas

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SlotBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=50)
    polygon: List[List[float]] = Field(..., min_length=3)  # At least 3 points for a polygon

class SlotCreate(SlotBase):
    camera_id: int

class SlotUpdate(BaseModel):
    label: Optional[str] = None
    polygon: Optional[List[List[float]]] = None
    status: Optional[str] = None

class SlotResponse(SlotBase):
    id: int
    camera_id: int
    status: str
    last_changed_at: datetime

    model_config = {
        "from_attributes": True
    }

class SlotStatusResponse(BaseModel):
    total: int
    empty: int
    occupied: int
    reserved: int
    disabled: int