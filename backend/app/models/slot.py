# Parking slot ORM model

from sqlalchemy import Column, Integer, String, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.core.db import Base

class SlotStatus(str, enum.Enum):
    EMPTY = "empty"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    DISABLED = "disabled"

class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=False)

    # Label for the slot (e.g., "A1", "B2")
    label = Column(String(50), nullable=False)

    # Polygon coordinates [[x1, y1], [x2, y2], ...]
    polygon = Column(JSON, nullable=False)

    status = Column(Enum(SlotStatus), default=SlotStatus.EMPTY)
    last_changed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    camera = relationship("Camera", back_populates="slots")
    events = relationship("SlotEvent", back_populates="slot", cascade="all, delete-orphan")