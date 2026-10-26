"""Pydantic response and request schemas."""

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """Standard greeting message response."""
    message: str = Field(..., example="hello there")


class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = Field(..., example="healthy")
    environment: str = Field(..., example="production")
