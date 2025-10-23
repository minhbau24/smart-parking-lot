# Models package

from app.core.db import Base
from app.models.camera import Camera, CameraStatus
from app.models.slot import Slot, SlotStatus
from app.models.detection import Detection
from app.models.slot_event import SlotEvent

__all__ = [
    "Base",
    "Camera", "CameraStatus",
    "Slot", "SlotStatus",
    "Detection",
    "SlotEvent",
]