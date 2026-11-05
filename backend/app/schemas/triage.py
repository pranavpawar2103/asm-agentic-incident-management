"""Triage agent schemas."""

from typing import Any

from pydantic import BaseModel, Field


class TriageRunResponse(BaseModel):
    """Result of triaging the tickets that passed Data Quality."""
    evaluated: int = Field(..., examples=[20])
    skipped: int = Field(..., examples=[0])
    model_errors: int = Field(0, examples=[0], description="Tickets left in dq_passed because the model gave no usable answer")
    needs_review: int = Field(0, examples=[2], description="Recommendations far from the reporter's priority")
    by_verdict: dict[str, int] = Field(..., examples=[{"P1": 3, "P2": 4, "P3": 9, "P4": 3, "uncertain": 1}])


class TriageCheckResponse(BaseModel):
    """Recommended priority for one ticket."""
    ticket_id: str = Field(..., examples=["AMS-1209"])
    verdict: str = Field(..., examples=["P3"])
    stage: str = Field(..., examples=["rules"], description="rules, or model when the rules could not decide")
    pipeline_status: str = Field(..., examples=["triaged"])
    output: dict[str, Any] = Field(..., description="Priority, reported priority, rule, reason; model stage adds the audit")
