"""FastAPI Application factory and lifecycle."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin.runtime_config import apply_overrides
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import global_exception_handler
from app.core.logging import setup_logging
from app.core.middleware import RequestLoggingMiddleware
from app.db.session import AsyncSessionLocal, close_db

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle startup and shutdown events."""
    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} [{settings.ENVIRONMENT}]")
    async with AsyncSessionLocal() as db:
        await db.run_sync(apply_overrides)  # admin changes survive a restart
    try:
        yield
    finally:
        logger.info(f"Shutting down {settings.PROJECT_NAME}")
        await close_db()


def create_application() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS Middleware
    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Custom Logging & Request Tracking Middleware
    app.add_middleware(RequestLoggingMiddleware)

    # Exception Handlers
    app.add_exception_handler(Exception, global_exception_handler)

    # Routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_application()
