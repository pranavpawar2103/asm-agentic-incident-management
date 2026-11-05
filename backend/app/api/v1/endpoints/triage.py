"""Triage agent endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.ticket import PipelineStatus, Ticket
from app.schemas.triage import (
    ReviewCreate,
    ReviewOut,
    ReviewQueueItem,
    ReviewReportOut,
    TriageCheckResponse,
    TriageRunResponse,
)
from app.services import triage_review
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


@router.get("/review-queue", response_model=list[ReviewQueueItem], summary="Recommendations waiting for an engineer")
async def review_queue(limit: int = Query(50, ge=1, le=500), db: AsyncSession = Depends(get_db)) -> list[ReviewQueueItem]:
    """Triaged tickets, flagged ones first (a lowered P1/P2, a lean-high guess, a large shift), then by urgency and age."""
    queue = await db.run_sync(triage_review.pending, limit)
    return [
        ReviewQueueItem(
            ticket_id=t.id, summary=t.summary, application=t.application, opened_at=t.opened_at,
            reported_priority=t.reported_priority, recommended_priority=run.output["priority"], rule=run.output["rule"],
            reason=run.output["reason"], stage=run.output["stage"], flags=triage_review.flags(run.output),
        )
        for t, run in queue
    ]


@router.post("/tickets/{ticket_id}/review", response_model=ReviewOut, status_code=201, summary="Record an engineer's decision")
async def review_ticket(ticket_id: str, payload: ReviewCreate, db: AsyncSession = Depends(get_db)) -> ReviewOut:
    """Accept, edit or reject the latest recommendation. The ticket moves on to Resolution; the source is not changed."""
    return await db.run_sync(_review_one, ticket_id, payload)


def _review_one(db: Session, ticket_id: str, payload: ReviewCreate) -> ReviewOut:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    if ticket.pipeline_status != PipelineStatus.TRIAGED:
        raise HTTPException(status_code=409, detail=f"Ticket {ticket_id} is {ticket.pipeline_status}, not triaged")
    try:
        decision = triage_review.review(db, ticket, **payload.model_dump())
    except triage_review.ReviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ReviewOut.model_validate(decision)


@router.get("/review-report", response_model=ReviewReportOut, summary="How often engineers change the recommendation")
async def review_report(days: int = Query(7, ge=1, le=365), db: AsyncSession = Depends(get_db)) -> ReviewReportOut:
    """Agreement overall, by rule and by stage, and the reasons given: where the rulebook needs fixing."""
    r = await db.run_sync(triage_review.report, days)
    return ReviewReportOut(
        days=r.days, reviewed=r.reviewed, agreement=r.agreement, by_action=dict(r.by_action),
        raised_by_engineer=r.raised_by_engineer, lowered_by_engineer=r.lowered_by_engineer, by_reason=dict(r.by_reason),
        by_rule={k: dict(v) for k, v in r.by_rule.items()}, by_stage={k: dict(v) for k, v in r.by_stage.items()},
    )
