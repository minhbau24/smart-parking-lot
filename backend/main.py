# FastAPI application

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.logger import logger
from app.core.settings import settings
from app.routes import health_routes, camera_routes, slot_routes, detection_routes, stream_routes, websocket_routes, detector_routes
from app.services import ai_listener
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event for FastAPI app."""
    logger.info("Starting Smart Parking API...")
    
    # Save event loop for ai_listener to use in threads
    loop = asyncio.get_event_loop()
    ai_listener.set_event_loop(loop)
    logger.info("Event loop configured for ai_listener")
    
    # Note: Detectors are now started dynamically via API
    # Use POST /api/v1/detectors/{camera_id}/start to start detection
    logger.info("Use POST /api/v1/detectors/{camera_id}/start to start camera detection")
    
    yield
    
    # Cleanup - stop all detectors
    ai_listener.stop_detector()
    logger.info("Shutting down Smart Parking API...")

app = FastAPI(
    title="Smart Parking API",
    version="1.0.0",
    description="Backend API for Smart Parking Lot Management System",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(health_routes.router, tags=["Health"])
app.include_router(camera_routes.router, prefix="/api/v1", tags=["Cameras"])
app.include_router(slot_routes.router, prefix="/api/v1", tags=["Slots"])
app.include_router(detection_routes.router, prefix="/api/v1", tags=["Detections"])
app.include_router(detector_routes.router, prefix="/api/v1", tags=["Detectors"])
app.include_router(stream_routes.router, prefix="/api/v1", tags=["Stream"])
app.include_router(websocket_routes.router, tags=["WebSocket"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Smart Parking API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )