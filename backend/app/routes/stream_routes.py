# Video streaming routes

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
import cv2
from app.services.ai_listener import get_detector, list_active_detectors
from app.core.logger import logger

router = APIRouter()


def generate_video_stream(camera_id: int):
    """Generate video frames for streaming"""
    detector = get_detector(camera_id)
    
    if detector is None:
        logger.error(f"Detector for camera {camera_id} not found")
        return
    
    while True:
        # Get current frame
        frame = detector.get_current_frame()
        if frame is None:
            continue
        
        # Encode frame to JPEG
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue
        
        frame_bytes = buffer.tobytes()
        
        # Yield frame in multipart format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')


@router.get("/stream/{camera_id}")
async def video_stream(camera_id: int):
    """
    Stream raw video from camera (without annotations)
    
    Usage in HTML:
    <img src="http://localhost:8000/api/v1/stream/1" />
    """
    detector = get_detector(camera_id)
    
    if detector is None:
        raise HTTPException(
            status_code=404,
            detail=f"Detector for camera {camera_id} not found. Start detector first."
        )
    
    return StreamingResponse(
        generate_video_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/stream/{camera_id}/stats")
async def stream_stats(camera_id: int):
    """Get detector statistics for a specific camera"""
    detector = get_detector(camera_id)
    
    if detector is None:
        raise HTTPException(
            status_code=404,
            detail=f"Detector for camera {camera_id} not found"
        )
    
    return detector.get_stats()


@router.get("/stream/active")
async def list_active_streams():
    """List all active camera streams"""
    return list_active_detectors()


@router.get("/stream/{camera_id}/snapshot")
async def capture_snapshot(camera_id: int):
    """
    Capture a single frame snapshot from camera (for annotation)
    
    Returns a static JPEG image
    """
    detector = get_detector(camera_id)
    
    if detector is None:
        raise HTTPException(
            status_code=404,
            detail=f"Detector for camera {camera_id} not found. Start detector first."
        )
    
    # Get current frame
    frame = detector.get_current_frame()
    
    if frame is None:
        raise HTTPException(
            status_code=503,
            detail="No frame available from camera"
        )
    
    # Encode frame to JPEG with high quality
    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
    
    if not ret:
        raise HTTPException(
            status_code=500,
            detail="Failed to encode frame"
        )
    
    # Return as static image
    return Response(
        content=buffer.tobytes(),
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
