# Slot API endpoints
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.db import get_db_session
from app.models.slot import Slot
from app.schemas.slot_schema import SlotCreate,SlotResponse, SlotUpdate, SlotStatusResponse
from app.services.slot_service import get_slot_status

router = APIRouter()

@router.get("/slots", response_model=List[SlotResponse])
async def list_slots(
    camera_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get list of parking slots, filter by camera_id if provided.
    """
    query = select(Slot)
    if camera_id:
        query = query.where(Slot.camera_id == camera_id)

    result = await db.execute(query)
    slots = result.scalars().all()
    return slots

@router.post("/slots", response_model=SlotResponse, status_code=201)
async def create_slot(
    slot_data: SlotCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new parking slot.
    """
    slot = Slot(**slot_data.model_dump())
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return slot

@router.get("/slots/status", response_model=SlotStatusResponse)
async def get_all_slots_status(
    db: AsyncSession = Depends(get_db_session)
):
    """Lấy thống kê tất cả slots"""
    stats = await get_slot_status(None, db)
    return stats

@router.get("/slots/stats/{camera_id}", response_model=SlotStatusResponse)
async def slot_statistics(
    camera_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Lấy thống kê slots theo camera"""
    stats = await get_slot_status(camera_id, db)
    return stats

@router.get("/slots/{slot_id}", response_model=SlotResponse)
async def get_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get details of a specific parking slot by ID.
    """
    result = await db.execute(
        select(Slot).where(Slot.id == slot_id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot

@router.delete("/slots/{slot_id}", status_code=204)
async def delete_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Delete a parking slot by ID.
    """
    result = await db.execute(
        select(Slot).where(Slot.id == slot_id)
    )
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    await db.delete(slot)
    await db.commit()
    return None  # No content response