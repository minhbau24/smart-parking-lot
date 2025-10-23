# WebSocket manager - real-time data to frontend
from datetime import datetime
from typing import List
from fastapi import WebSocket
import json
from app.core.logger import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Gửi message tới tất cả connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)
    
    async def send_slot_update(self, camera_id: int, slots: List[dict], frame_id: int = None, timestamp: float = None, detections: List[dict] = None):
        """Gửi slot update event with frame sync info and detections"""
        message = {
            "type": "slot_update",
            "camera_id": camera_id,
            "slots": slots,
            "detections": detections or [],  # Include detection bboxes
            "frame_id": frame_id,  # For sync with video
            "timestamp": timestamp or datetime.utcnow().timestamp(),
            "datetime": datetime.utcnow().isoformat()
        }
        await self.broadcast(message)

manager = ConnectionManager()