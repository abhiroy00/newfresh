#!/usr/bin/env python3
"""Create carousel table in the database"""
import asyncio
from app.core.database import engine, Base

async def create_tables():
    """Create carousel table"""
    async with engine.begin() as conn:
        # Create all tables from Base metadata
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Carousel table created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
