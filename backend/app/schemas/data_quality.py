"""Data Quality agent schemas."""

from pydantic import BaseModel, Field


class DataQualityRunResponse(BaseModel):
    """Result of checking the pending tickets."""
    evaluated: int = Field(..., examples=[67])
    skipped: int = Field(..., examples=[0])
    by_verdict: dict[str, int] = Field(..., examples=[{"uncertain": 52, "needs_info": 14, "not_an_incident": 1}])
