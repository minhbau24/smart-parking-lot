from sqlalchemy import text
from app.core.db import engine
import asyncio

async def test_connection():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        print(result.scalar())  # in ra 1

asyncio.run(test_connection())
