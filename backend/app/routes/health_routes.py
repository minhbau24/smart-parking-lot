# Health check endpoint
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.db import get_db_session

router = APIRouter()

@router.get("/healthz")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "ok"}

@router.get("/health/db")
async def database_health(db: AsyncSession = Depends(get_db_session)):
    """Database health check endpoint."""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "database ok", "database": "connected"}
    except Exception as e:
        return {"status": "database error", "database": str(e)}