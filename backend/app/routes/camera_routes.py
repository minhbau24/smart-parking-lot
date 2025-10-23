# Camera API endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.db import get_db_session
from app.models.camera import Camera
from app.schemas.camera_schema import CameraCreate, CameraResponse, CameraUpdate

router = APIRouter()

@router.get("/cameras", response_model=List[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db_session)):
    """Lấy danh sách tất cả cameras"""
    result = await db.execute(select(Camera))
    cameras = result.scalars().all()
    return cameras

@router.get("/cameras-active", response_model=List[CameraResponse])
async def list_active_cameras(db: AsyncSession = Depends(get_db_session)):
    """Lấy danh sách tất cả cameras đang hoạt động"""
    result = await db.execute(select(Camera).where(Camera.status == "active"))
    cameras = result.scalars().all()
    return cameras

@router.post("/cameras", response_model=CameraResponse, status_code=201)
async def create_camera(
    camera_data: CameraCreate,
    db: AsyncSession = Depends(get_db_session)
):
    """Tạo camera mới"""
    camera = Camera(**camera_data.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera

@router.get("/cameras/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db_session)
):
    """Lấy thông tin 1 camera"""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.patch("/cameras/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    camera_data: CameraUpdate,
    db: AsyncSession = Depends(get_db_session)
):
    """Update thông tin camera"""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    for key, value in camera_data.model_dump(exclude_unset=True).items():
        setattr(camera, key, value)
    
    await db.commit()
    await db.refresh(camera)
    return camera