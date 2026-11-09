"""Resolution agent endpoints."""

from fastapi import APIRouter

from app.schemas.resolution import ResolutionRunResponse
from app.services.resolution import run_resolution

router = APIRouter(prefix="/resolution", tags=["resolution"])


@router.post("/run", response_model=ResolutionRunResponse, summary="Find runbook resolutions for reviewed tickets")
async def run() -> ResolutionRunResponse:
    """Search the runbooks for every reviewed ticket and record the answer. Safe to re-run: unchanged tickets are skipped."""
    result = await run_resolution()
    return ResolutionRunResponse(
        evaluated=result.evaluated, skipped=result.skipped, model_errors=result.model_errors,
        by_verdict=dict(result.by_verdict),
    )
