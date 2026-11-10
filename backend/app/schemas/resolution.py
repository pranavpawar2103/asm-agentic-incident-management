"""Resolution agent API schemas."""

from pydantic import BaseModel


class ResolutionRunResponse(BaseModel):
    evaluated: int
    skipped: int
    model_errors: int
    by_verdict: dict[str, int]
