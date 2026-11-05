"""Triage agent endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.ticket import PipelineStatus, Ticket
from app.schemas.triage import TriageCheckResponse, TriageRunResponse
from app.services.triage import run_triage, triage_ticket

router = APIRouter(prefix="/triage", tags=["triage"])


@router.post("/run", response_model=TriageRunResponse, summary="Triage tickets that passed Data Quality")
async def run(db: AsyncSession = Depends(get_db)) -> TriageRunResponse:
    """Recommend a priority for every dq_passed ticket. Safe to re-run: unchanged tickets are skipped."""
    result = await db.run_sync(run_triage)
    return TriageRunResponse(
        evaluated=result.evaluated, skipped=result.skipped, model_errors=result.model_errors,
        needs_review=result.needs_review, by_verdict=dict(result.by_verdict),
    )


@router.post("/tickets/{ticket_id}/check", response_model=TriageCheckResponse, summary="Triage one ticket")
async def check_one_ticket(ticket_id: str, db: AsyncSession = Depends(get_db)) -> TriageCheckResponse:
    """Rules, then the model once if the rules cannot settle it. Without the model the rules' own answer is used."""
    return await db.run_sync(_check_one, ticket_id)


def _check_one(db: Session, ticket_id: str) -> TriageCheckResponse:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    if ticket.pipeline_status != PipelineStatus.DQ_PASSED:
        raise HTTPException(status_code=409, detail=f"Ticket {ticket_id} is {ticket.pipeline_status}, not dq_passed")

    agent_run, _ = triage_ticket(db, ticket)
    db.commit()
    return TriageCheckResponse(
        ticket_id=ticket.id,
        verdict=agent_run.verdict,
        stage=agent_run.output["stage"],
        pipeline_status=ticket.pipeline_status,
        output=agent_run.output,
    )
