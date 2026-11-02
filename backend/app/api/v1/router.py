"""API v1 router registry."""

from fastapi import APIRouter

from app.admin import router as admin
from app.api.v1.endpoints import data_quality, health, hello, tickets

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(hello.router)
api_router.include_router(tickets.router)
api_router.include_router(data_quality.router)
api_router.include_router(admin.router)
