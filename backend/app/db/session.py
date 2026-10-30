"""Async PostgreSQL/Supabase database engine, session factory, and dependencies."""

from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


engine_options: dict = {
    "pool_pre_ping": settings.DB_POOL_PRE_PING,
    "echo": settings.DB_ECHO,
}
if not settings.DATABASE_URL.startswith("sqlite"):
    engine_options.update(pool_size=settings.DB_POOL_SIZE, max_overflow=settings.DB_MAX_OVERFLOW)

engine: AsyncEngine = create_async_engine(settings.DATABASE_URL, **engine_options)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)


async def check_db_connection() -> None:
    """Verify database connectivity."""
    from sqlalchemy import text

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def init_local_db() -> None:
    """Create the demo schema when the application is run with local SQLite."""
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose of engine connection pool."""
    await engine.dispose()


async def get_db() -> AsyncIterator[AsyncSession]:
    """Provide a scoped async database session on-demand per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
