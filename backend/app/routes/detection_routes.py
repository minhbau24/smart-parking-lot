# Detection API endpoints
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db_session
from app.schemas.detection_schema import DetectionBase, DetectionResponse
from app.models.detection import Detection
from app.services.slot_service import match_detections_to_slots, update_slot_statuses
from app.core.logger import logger
from app.services.websocket_manager import manager
router = APIRouter()

@router.post("/detections", status_code=201)
async def receive_detections(
    data: DetectionBase,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Get detections data from YOLO model

    Requests body example:
    {
        "camera_id": 1,
        "detections": [
            {
                "bbox": [100, 200, 50, 80],
                "confidence": 0.95,
                "class": "car"
            },
            {
                "bbox": [300, 400, 60, 90],
                "confidence": 0.88,
                "class": "car"
            }
        ]
    }    
    """
    try: 
        # 1. Save detections to DB
        for det in data.detections:
            detection = Detection(
                camera_id=data.camera_id,
                bbox=det.get("bbox"),
                confidence=det.get("confidence"),
                class_name=det.get("class_name")
            )
            db.add(detection)
        
        await db.commit()

        # 2. Match with slots
        slot_status_map = await match_detections_to_slots(
            camera_id=data.camera_id,
            detections=data.detections,
            db=db
        )

        # 3. Update slot statuses
        await update_slot_statuses(slot_status_map, db)
        slots_data = [
            {"slot_id": slot_id, "status": status}
            for slot_id, status in slot_status_map.items()
        ]
        await manager.send_slot_update(data.camera_id, slots_data)
        logger.info(f"Processed {len(data.detections)} detections for camera {data.camera_id}")

        return {
            "status": "success",
            "camera_id": data.camera_id,
            "detections_count": len(data.detections),
            "slots_updated": len(slot_status_map)
        }
    except Exception as e:
        logger.error(f"Error processing detections: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")