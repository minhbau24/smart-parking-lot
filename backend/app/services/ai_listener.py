# AI Listener - receive data from YOLO module

import asyncio
import cv2
import time
import numpy as np
from typing import Optional, Dict
from collections import deque
from threading import Thread, Lock

from app.core.logger import logger
from app.services.slot_service import match_detections_to_slots, update_slot_statuses
from app.services.websocket_manager import manager
from app.core.db import async_session_maker

class YOLODetector:
    """
    YOLO Detection service running in background
    Supports both detection and video streaming
    """
    
    def __init__(self, camera_id: int, stream_url: str, model_path: str = "yolov8n.pt", loop=None):
        self.camera_id = camera_id
        self.stream_url = stream_url
        self.model_path = model_path
        
        # State
        self.running = False
        self.model = None
        self.cap = None
        
        # Frame management
        self.current_frame = None
        self.frame_lock = Lock()
        self.frame_id = 0
        
        # Detection settings
        self.detection_interval = 3  # Detect every N frames
        self.target_classes = [2, 5, 7]  # car, bus, truck in COCO
        
        # Frame buffer for sync
        self.frame_buffer = deque(maxlen=60)
        
        # Event loop for async operations
        self.loop = loop or asyncio.get_event_loop()
        
        logger.info(f"Initialized YOLO detector for camera {camera_id}")
    
    def start(self):
        """Start detection in background thread"""
        if self.running:
            logger.warning("Detector already running")
            return
        
        self.running = True
        
        # Start in separate thread (because cv2 is blocking)
        thread = Thread(target=self._detection_loop, daemon=True)
        thread.start()
        
        logger.info(f"Started YOLO detector for camera {self.camera_id}")
    
    def stop(self):
        """Stop detection"""
        self.running = False
        if self.cap:
            self.cap.release()
        logger.info(f"Stopped YOLO detector for camera {self.camera_id}")
    
    def _detection_loop(self):
        """Main detection loop (runs in thread)"""
        try:
            # Import YOLO here to avoid loading at startup
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            logger.info(f"Loaded YOLO model: {self.model_path}")
            
            # Convert stream_url to appropriate type
            # If it's a digit string (webcam index), convert to int
            capture_source = self.stream_url
            if isinstance(capture_source, str) and capture_source.isdigit():
                capture_source = int(capture_source)
                logger.info(f"Using webcam index: {capture_source}")
            else:
                logger.info(f"Using stream URL: {capture_source}")
            
            # Open video capture
            self.cap = cv2.VideoCapture(capture_source)
            if not self.cap.isOpened():
                logger.error(f"Failed to open camera: {capture_source}")
                return
            
            fps = int(self.cap.get(cv2.CAP_PROP_FPS)) or 30
            logger.info(f"Camera FPS: {fps}")
            
            while self.running:
                ret, frame = self.cap.read()
                if not ret:
                    logger.warning("Failed to read frame")
                    time.sleep(0.1)
                    continue
                
                self.frame_id += 1
                current_time = time.time()
                
                # Update current frame (for streaming)
                with self.frame_lock:
                    self.current_frame = frame.copy()
                
                # Store frame info
                frame_info = {
                    'frame_id': self.frame_id,
                    'timestamp': current_time,
                    'processed': False
                }
                self.frame_buffer.append(frame_info)
                
                # Run detection every N frames
                if self.frame_id % self.detection_interval == 0:
                    self._process_frame(frame, self.frame_id, current_time)
                
                # Control FPS
                time.sleep(1.0 / fps)
        
        except Exception as e:
            logger.error(f"Error in detection loop: {e}", exc_info=True)
        finally:
            if self.cap:
                self.cap.release()
    
    def _process_frame(self, frame, frame_id: int, timestamp: float):
        """Process a single frame with YOLO"""
        try:
            # Run YOLO inference
            results = self.model(frame, verbose=False)
            
            # Parse results
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                
                for box in boxes:
                    cls = int(box.cls[0])
                    
                    # Filter by class (only vehicles)
                    # if cls not in self.target_classes:
                    #     continue
                    
                    # Get bbox in xywh format
                    x, y, w, h = box.xywh[0].tolist()
                    conf = float(box.conf[0])
                    
                    detections.append({
                        "bbox": [float(x), float(y), float(w), float(h)],
                        "confidence": conf,
                        "class_name": self.model.names[cls]
                    })
            
            # Mark frame as processed
            for f in self.frame_buffer:
                if f['frame_id'] == frame_id:
                    f['processed'] = True
                    break
            
            # Process detections async in main event loop
            if detections:
                # Schedule coroutine in FastAPI's event loop (thread-safe)
                asyncio.run_coroutine_threadsafe(
                    self._handle_detections(detections, frame_id, timestamp),
                    self.loop
                )
            
            logger.debug(f"Frame {frame_id}: {len(detections)} detections")
        
        except Exception as e:
            logger.error(f"Error processing frame {frame_id}: {e}")
    
    async def _handle_detections(self, detections: list, frame_id: int, timestamp: float):
        """Handle detections: match slots, update DB, broadcast"""
        try:
            async with async_session_maker() as db:
                # Match detections to slots
                slot_status_map = await match_detections_to_slots(
                    camera_id=self.camera_id,
                    detections=detections,
                    db=db
                )
                
                # Update slot statuses in DB
                await update_slot_statuses(slot_status_map, db)
                
                # Ensure all changes are committed
                await db.commit()
                
                # Prepare data for broadcast
                slots_data = [
                    {
                        "slot_id": slot_id,
                        "status": status
                    }
                    for slot_id, status in slot_status_map.items()
                ]
                
                # Broadcast via WebSocket with frame sync info
                await manager.send_slot_update(
                    camera_id=self.camera_id,
                    slots=slots_data,
                    frame_id=frame_id,
                    timestamp=timestamp,
                    detections=detections  # Include detection bboxes
                )
                
                logger.info(f"Processed {len(detections)} detections, updated {len(slot_status_map)} slots")
        
        except Exception as e:
            logger.error(f"Error handling detections: {e}", exc_info=True)
    
    def get_current_frame(self) -> Optional[np.ndarray]:
        """Get current frame for streaming"""
        with self.frame_lock:
            return self.current_frame.copy() if self.current_frame is not None else None
    
    def get_stats(self) -> Dict:
        """Get detector statistics"""
        processed = sum(1 for f in self.frame_buffer if f['processed'])
        return {
            "camera_id": self.camera_id,
            "running": self.running,
            "frame_id": self.frame_id,
            "processed_frames": processed,
            "total_frames": len(self.frame_buffer),
            "detection_rate": f"{processed}/{len(self.frame_buffer)}"
        }


# Global detector registry (support multiple cameras)
_detectors: Dict[int, YOLODetector] = {}

# Global event loop reference (set from main.py)
_event_loop: Optional[asyncio.AbstractEventLoop] = None


def set_event_loop(loop: asyncio.AbstractEventLoop):
    """Set the event loop to use for all detectors"""
    global _event_loop
    _event_loop = loop
    logger.info("Event loop set for ai_listener")


def get_detector(camera_id: int) -> Optional[YOLODetector]:
    """Get detector for a specific camera"""
    return _detectors.get(camera_id)


def init_detector(camera_id: int, stream_url: str, model_path: str = "yolov8n.pt"):
    """Initialize and start detector for a camera"""
    # Check if detector already exists
    if camera_id in _detectors:
        logger.warning(f"Detector for camera {camera_id} already exists")
        return _detectors[camera_id]
    
    # Use the global event loop set from main.py
    loop = _event_loop
    if loop is None:
        # Fallback: try to get current loop
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop()
    
    # Create and start detector
    detector = YOLODetector(camera_id, stream_url, model_path, loop=loop)
    detector.start()
    
    # Store in registry
    _detectors[camera_id] = detector
    logger.info(f"Registered detector for camera {camera_id}")
    
    return detector


def stop_detector(camera_id: int = None):
    """Stop detector for a specific camera, or all if camera_id is None"""
    if camera_id is not None:
        # Stop specific camera
        detector = _detectors.get(camera_id)
        if detector:
            detector.stop()
            del _detectors[camera_id]
            logger.info(f"Stopped detector for camera {camera_id}")
    else:
        # Stop all detectors
        for cid, detector in list(_detectors.items()):
            detector.stop()
            logger.info(f"Stopped detector for camera {cid}")
        _detectors.clear()


def list_active_detectors() -> Dict[int, Dict]:
    """List all active detectors with their stats"""
    return {
        camera_id: detector.get_stats()
        for camera_id, detector in _detectors.items()
    }

