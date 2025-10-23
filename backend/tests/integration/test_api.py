# Integration tests for API endpoints
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_full_flow():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. Create camera
        camera_resp = await client.post("/api/v1/cameras", json={
            "name": "Camera 1",
            "location": "Entrance",
            "stream_url": "rtsp://example.com/stream"
        })
        assert camera_resp.status_code == 201
        camera_id = camera_resp.json()["id"]
        
        # 2. Create slots
        slot_resp = await client.post("/api/v1/slots", json={
            "camera_id": camera_id,
            "label": "A1",
            "polygon": [[0, 0], [100, 0], [100, 100], [0, 100]]
        })
        assert slot_resp.status_code == 201
        
        # 3. Send detection
        det_resp = await client.post("/api/v1/detections", json={
            "camera_id": camera_id,
            "detections": [
                {"bbox": [10, 10, 80, 80], "confidence": 0.95, "class_name": "car"}
            ]
        })
        assert det_resp.status_code == 201
        
        # 4. Check slot status
        slots = await client.get(f"/api/v1/slots?camera_id={camera_id}")
        assert slots.status_code == 200
        slot_data = slots.json()[0]
        assert slot_data["status"] == "occupied"  # Should be occupied now