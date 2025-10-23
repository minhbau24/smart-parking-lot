# Vehicle detection ORM model
from sqlalchemy import Column, Integer, JSON, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.db import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)

    # Bounding box [x, y, w, h]
    bbox = Column(JSON, nullable=False)

    # Confidence score
    confidence = Column(Float, nullable=False)

    # Class name (car, truck, motorcycle, etc.)
    class_name = Column(String(50), nullable=False)

    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    camera = relationship("Camera", back_populates="detections")
