"""ServiceNow tickets API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.servicenow import ServiceNowTicket
from app.schemas.servicenow import ServiceNowTicketDetail, ServiceNowTicketList

router = APIRouter(prefix="/servicenow", tags=["servicenow"])


@router.get("/tickets", response_model=ServiceNowTicketList, summary="List ServiceNow tickets")
async def list_servicenow_tickets(
    dq_flag: Optional[bool] = Query(None, description="Filter by DQ flag"),
    dq_reason: Optional[str] = Query(None, description="Filter by DQ reason"),
    service: Optional[str] = Query(None, description="Filter by service"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    caller: Optional[str] = Query(None, description="Filter by caller"),
    is_unresolved: Optional[bool] = Query(None, description="Filter only unresolved tickets (closed_at is null)"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ServiceNowTicketList:
    """ServiceNow tickets, filterable by DQ status and metadata."""
    query = select(ServiceNowTicket)

    if dq_flag is not None:
        query = query.where(ServiceNowTicket.dq_flag == dq_flag)
    if dq_reason is not None:
        query = query.where(ServiceNowTicket.dq_reason.ilike(f"%{dq_reason}%"))
    if service is not None:
        query = query.where(ServiceNowTicket.service == service)
    if priority is not None:
        query = query.where(ServiceNowTicket.priority == priority)
    if caller is not None:
        query = query.where(ServiceNowTicket.caller.ilike(f"%{caller}%"))
    if is_unresolved is True:
        query = query.where(ServiceNowTicket.closed_at.is_(None))
    elif is_unresolved is False:
        query = query.where(ServiceNowTicket.closed_at.is_not(None))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    items = await db.scalars(
        query.order_by(ServiceNowTicket.opened_at.desc().nulls_last())
        .limit(limit)
        .offset(offset)
    )
    return ServiceNowTicketList(total=total or 0, items=list(items.all()))


@router.get("/tickets/{ticket_id}", response_model=ServiceNowTicketDetail, summary="Get one ServiceNow ticket")
async def get_servicenow_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
) -> ServiceNowTicket:
    """Get single ServiceNow ticket detail by ID."""
    ticket = await db.get(ServiceNowTicket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"ServiceNow ticket {ticket_id} not found")
    return ticket
