# Camera ORM model
from sqlalchemy import Column, Integer, String, JSON, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.db import Base

class CameraStatus(str, enum.Enum):
    ACTIVE = "activate"
    INACTIVE = "inactive"
    ERROR = "error"

class SourceType(str, enum.Enum):
    WEBCAM = "webcam"      # Built-in or USB webcam (e.g., 0, 1, 2)
    RTSP = "rtsp"          # IP camera with RTSP stream
    FILE = "file"          # Video file from disk
    HTTP = "http"          # HTTP/MJPEG stream

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255))
    stream_url = Column(String(255))
    
    # Source type: webcam, rtsp, file, http
    source_type = Column(Enum(SourceType), default=SourceType.WEBCAM)

    # Homography matrix (4x4) for transform coordinates
    homography_matrix = Column(JSON, nullable=True)

    status = Column(Enum(CameraStatus), default=CameraStatus.INACTIVE)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    slots = relationship("Slot", back_populates="camera", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="camera")