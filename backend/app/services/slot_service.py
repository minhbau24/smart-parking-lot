# Slot service - parking slot status logic
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import numpy as np

from app.models.slot import Slot, SlotStatus
from app.models.slot_event import SlotEvent
from app.utils.polygon_utils import (
    bbox_to_polygon,
    polygon_from_points,
    calculate_overlap_ratio
)
from app.core.settings import settings
from app.core.logger import logger

class SlotStatusBuffer:
    """Buffer to smooth status changes for N frames."""
    def __init__(self, smooth_frames: int = 3):
        self.buffer: Dict[int, List[str]] = {} # slot_id -> [status, status, ...]
        self.smoothing_frames = smooth_frames

    def add_status(self, slot_id: int, status: str) -> str:
        """
        Add a new status for buffer, return stable status
        """
        if slot_id not in self.buffer:
            self.buffer[slot_id] = []

        self.buffer[slot_id].append(status)

        # Keep only the last N statuses
        if len(self.buffer[slot_id]) > self.smoothing_frames:
            self.buffer[slot_id].pop(0)
        
        # if we have enough frames, determine stable status
        if len(self.buffer[slot_id]) < self.smoothing_frames:
            return self.buffer[slot_id][0]
        
        # Vote: most common status in buffer
        from collections import Counter
        counter = Counter(self.buffer[slot_id])
        most_common_status = counter.most_common(1)[0][0]

        return most_common_status
    
# Global buffer instance
status_buffer = SlotStatusBuffer(smooth_frames=settings.SMOOTHING_FRAMES)

async def match_detections_to_slots(
        camera_id: int,
        detections: List[Dict],
        db: AsyncSession,
        threshold: float = None
) -> Dict[int, str]:
    """
    Match detections with slots, return dict {slot_id: new_status}
    
    Args:
        camera_id (int): ID of the camera
        detections (List[Dict]): List of detection dicts with 'bbox' key
        db (AsyncSession): Database session
        threshold (float): Overlap ratio threshold to consider slot occupied

    Returns:
        Dict[int, str]: Mapping of slot_id to new status
    """
    if threshold is None:
        threshold = settings.DETECTION_THRESHOLD

    # get all slots for the camera
    result = await db.execute(
        select(Slot).where(Slot.camera_id == camera_id)
    )
    slots = result.scalars().all()

    # Make polygons from slots
    slot_polygons = {}
    for slot in slots:
        try:
            slot_polygons[slot.id] = polygon_from_points(slot.polygon)
        except Exception as e:
            logger.error(f"Error creating polygon for slot {slot.id}: {e}")
            continue
    
    # Init all slots as empty
    slot_status_map = {slot.id: SlotStatus.EMPTY.value for slot in slots}

    # With each detectionm. find overlapp 
    for detection in detections:
        bbox = detection.get("bbox")
        if not bbox or len(bbox) != 4:
            continue

        try:
            bbox_poly = bbox_to_polygon(bbox)
        except Exception as e:
            logger.error(f"Invalid bbox {bbox}: {e}")
            continue

        # Find slot have highest overlap
        best_slot_id = None
        best_ratio = 0.0

        for slot_id, slot_poly in slot_polygons.items():
            ratio = calculate_overlap_ratio(bbox_poly, slot_poly)
            if ratio > best_ratio:
                best_ratio = ratio
                best_slot_id = slot_id
        
        # If best overlap exceeds threshold, mark slot as occupied
        if best_slot_id and best_ratio >= threshold:
            slot_status_map[best_slot_id] = SlotStatus.OCCUPIED.value

    # Apply smoothing 
    smoothed_status_map = {}
    for slot_id, raw_status in slot_status_map.items():
        smoothed_status = status_buffer.add_status(slot_id, raw_status)
        smoothed_status_map[slot_id] = smoothed_status
    
    return smoothed_status_map

async def update_slot_statuses(
        slot_status_map: Dict[int, str],
        db: AsyncSession
):
    """
    Update slot statuses in the database and make events
    
    Args:
        slot_status_map (Dict[int, str]): Mapping of slot_id to new status
        db (AsyncSession): Database session
    """
    updated_count = 0
    
    for slot_id, new_status in slot_status_map.items():
        # get slot current status
        result = await db.execute(
            select(Slot).where(Slot.id == slot_id)
        )
        slot = result.scalar_one_or_none()

        if not slot:
            continue
            
        old_status = slot.status.value

        # update only if status changed
        if old_status != new_status:
            # Update slot
            slot.status = SlotStatus(new_status)
            slot.last_changed_at = datetime.now(timezone.utc)

            # Create slot event
            event = SlotEvent(
                slot_id=slot.id,
                old_status=old_status,
                new_status=new_status,
                start_time=datetime.now(timezone.utc)
            )
            db.add(event)

            logger.info(f"Slot {slot.id} status changed from {old_status} to {new_status}")
            updated_count += 1
    
    # Log updates (commit will be done by caller)
    if updated_count > 0:
        logger.info(f"Updated {updated_count} slot status changes (ready to commit)")

async def get_slot_status(camera_id: int, db: AsyncSession) -> Dict:
    """
    Get summary of slot statuses for a camera
    
    Args:
        camera_id (int): ID of the camera
        db (AsyncSession): Database session
    Returns:
        Dict: Summary of slot statuses
    """
    result = await db.execute(
        select(Slot).where(Slot.camera_id == camera_id)
    )
    slots = result.scalars().all()

    status = {
        "total": len(slots),
        "empty": 0,
        "occupied": 0, 
        "reserved": 0,
        "disabled": 0
    }

    for slot in slots:
        status_key = slot.status.value
        if status_key in status:
            status[status_key] += 1
    
    return status