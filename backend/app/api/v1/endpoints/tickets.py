"""Ticket ingestion and query endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.ticket import Ticket
from app.schemas.ticket import IngestResponse, TicketDetail, TicketList
from app.services.ingestion import ingest_workbook

router = APIRouter(tags=["tickets"])


@router.post("/ingest", response_model=IngestResponse, summary="Load tickets from all sources")
async def ingest(db: AsyncSession = Depends(get_db)) -> IngestResponse:
    """Read ServiceNow, JIRA and Mailbox tickets from the workbook and upsert them. Safe to re-run."""
    try:
        # Note: sync ingestion helper
        result = ingest_workbook(db.sync_session, settings.TICKETS_FILE)
        await db.commit()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return IngestResponse(created=result.created, updated=result.updated, by_source=dict(result.by_source))


@router.get("/tickets", response_model=TicketList, summary="List tickets")
async def list_tickets(
    source: Optional[str] = Query(None, description="ServiceNow, JIRA or Mailbox"),
    status: Optional[str] = Query(None, description="new, in_progress, on_hold, resolved, closed"),
    application: Optional[str] = None,
    pipeline_status: Optional[str] = Query(None, description="pending, historical, ..."),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> TicketList:
    """Tickets newest first, optionally filtered."""
    query = select(Ticket)
    for column, value in [
        (Ticket.source, source),
        (Ticket.status, status),
        (Ticket.application, application),
        (Ticket.pipeline_status, pipeline_status),
    ]:
        if value is not None:
            query = query.where(column == value)

    total_result = await db.scalar(select(func.count()).select_from(query.subquery()))
    items_result = await db.scalars(query.order_by(Ticket.opened_at.desc()).limit(limit).offset(offset))
    return TicketList(total=total_result or 0, items=items_result.all())


@router.get("/tickets/{ticket_id}", response_model=TicketDetail, summary="Get one ticket")
async def get_ticket(ticket_id: str, db: AsyncSession = Depends(get_db)) -> Ticket:
    """Full ticket with its original source row and agent audit trail."""
    ticket = await db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return ticket
