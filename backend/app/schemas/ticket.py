"""Ticket request and response schemas."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class IngestResponse(BaseModel):
    """Result of loading the source workbook."""
    created: int = Field(..., examples=[100])
    updated: int = Field(..., examples=[0])
    by_source: dict[str, int] = Field(..., examples=[{"ServiceNow": 50, "JIRA": 30, "Mailbox": 20}])


class AgentRunOut(BaseModel):
    """One agent's verdict on a ticket."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    agent: str
    verdict: str
    output: dict[str, Any]
    created_at: datetime


class TicketSummary(BaseModel):
    """Ticket fields shown in lists."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    reporter_name: Optional[str]
    application: Optional[str]
    summary: str
    reported_priority: Optional[int]
    reported_priority_label: Optional[str]
    status: str
    pipeline_status: str
    opened_at: Optional[datetime]


class TicketDetail(TicketSummary):
    """Full ticket including the original source row and agent audit trail."""
    reporter_email: Optional[str]
    reporter_department: Optional[str]
    channel: Optional[str]
    category: Optional[str]
    subcategory: Optional[str]
    environment: Optional[str]
    description: str
    attachments: Optional[str]
    source_status: Optional[str]
    assignment_group: Optional[str]
    assignee: Optional[str]
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    raw: dict[str, Any]
    agent_runs: list[AgentRunOut]


class TicketList(BaseModel):
    """Paginated ticket list."""
    total: int
    items: list[TicketSummary]
