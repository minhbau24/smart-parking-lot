# Detector management routes

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.services.ai_listener import init_detector, stop_detector, get_detector, list_active_detectors
from app.core.db import get_db_session
from app.core.logger import logger
from app.models.camera import Camera

router = APIRouter()


class StartDetectorRequest(BaseModel):
    """Request to start detector for a camera"""
    yolo_model_path: str = "checkpoint_last.pt"


class DetectorResponse(BaseModel):
    """Response with detector status"""
    camera_id: int
    status: str
    message: str


@router.post("/detectors/{camera_id}/start", response_model=DetectorResponse)
async def start_detector(
    camera_id: int,
    request: StartDetectorRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Start YOLO detector for a specific camera.
    
    - Checks if camera exists in DB
    - Gets camera stream URL
    - Initializes detector with the camera feed
    """
    # Check if detector already running
    existing = get_detector(camera_id)
    if existing:
        return DetectorResponse(
            camera_id=camera_id,
            status="already_running",
            message=f"Detector for camera {camera_id} is already running"
        )
    
    # Get camera from DB
    result = await db.execute(
        Camera.__table__.select().where(Camera.id == camera_id)
    )
    camera = result.first()
    
    if not camera:
        raise HTTPException(
            status_code=404,
            detail=f"Camera {camera_id} not found"
        )
    
    # Start detector
    try:
        init_detector(
            camera_id=camera_id,
            stream_url=camera.stream_url,
            yolo_model_path=request.yolo_model_path
        )
        
        logger.info(f"Started detector for camera {camera_id}")
        
        return DetectorResponse(
            camera_id=camera_id,
            status="started",
            message=f"Detector started successfully for camera {camera_id}"
        )
    
    except Exception as e:
        logger.error(f"Failed to start detector for camera {camera_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start detector: {str(e)}"
        )


@router.delete("/detectors/{camera_id}/stop", response_model=DetectorResponse)
async def stop_detector_endpoint(camera_id: int):
    """
    Stop detector for a specific camera.
    """
    detector = get_detector(camera_id)
    
    if not detector:
        raise HTTPException(
            status_code=404,
            detail=f"Detector for camera {camera_id} not found or not running"
        )
    
    try:
        stop_detector(camera_id)
        
        logger.info(f"Stopped detector for camera {camera_id}")
        
        return DetectorResponse(
            camera_id=camera_id,
            status="stopped",
            message=f"Detector stopped successfully for camera {camera_id}"
        )
    
    except Exception as e:
        logger.error(f"Failed to stop detector for camera {camera_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop detector: {str(e)}"
        )


@router.delete("/detectors/stop-all", response_model=dict)
async def stop_all_detectors():
    """
    Stop all running detectors.
    """
    try:
        stop_detector()  # No camera_id = stop all
        
        logger.info("Stopped all detectors")
        
        return {
            "status": "stopped",
            "message": "All detectors stopped successfully"
        }
    
    except Exception as e:
        logger.error(f"Failed to stop all detectors: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop detectors: {str(e)}"
        )


@router.get("/detectors/")
async def list_detectors():
    """
    List all active detectors with their statistics.
    """
    return list_active_detectors()


@router.get("/detectors/{camera_id}/status")
async def get_detector_status(camera_id: int):
    """
    Get detector status for a specific camera.
    """
    detector = get_detector(camera_id)
    
    if detector:
        return {
            "camera_id": camera_id,
            "running": True,
            "stats": detector.get_stats()
        }
    else:
        return {
            "camera_id": camera_id,
            "running": False,
            "stats": None
        }
