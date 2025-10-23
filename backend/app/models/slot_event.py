# Slot event history ORM model

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.db import Base

class SlotEvent(Base):
    __tablename__ = "slot_events"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("slots.id"), nullable=False)

    old_status = Column(String(20), nullable=False)
    new_status = Column(String(20), nullable=False)

    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime, nullable=True)

    # Relationships
    slot = relationship("Slot", back_populates="events")

