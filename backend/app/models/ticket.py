"""Unified ticket model and agent audit trail."""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any, Optional
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PipelineStatus(StrEnum):
    """Where a ticket is in the agent pipeline."""
    HISTORICAL = "historical"  # closed in the source; reference only, never processed
    PENDING = "pending"  # waiting for the Data Quality check
    AWAITING_INFO = "awaiting_info"  # information missing; chase email drafted
    DQ_PASSED = "dq_passed"  # good enough, ready for Triage
    REJECTED = "rejected"  # not a real ticket, e.g. a test
    ERROR = "error"  # failed in a way that needs a person to look


class Ticket(Base):
    """A ticket from any source (ServiceNow, JIRA, Mailbox) in one common format."""

    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # source reference, e.g. INC0010231, AMS-1187, MBX-00001
    source: Mapped[str] = mapped_column(String(16), index=True)

    reporter_name: Mapped[Optional[str]] = mapped_column(String(128))
    reporter_email: Mapped[Optional[str]] = mapped_column(String(256))
    reporter_department: Mapped[Optional[str]] = mapped_column(String(128))
    channel: Mapped[Optional[str]] = mapped_column(String(32))

    application: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    category: Mapped[Optional[str]] = mapped_column(String(64))
    subcategory: Mapped[Optional[str]] = mapped_column(String(64))
    environment: Mapped[Optional[str]] = mapped_column(String(32))

    summary: Mapped[str] = mapped_column(String(512), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    attachments: Mapped[Optional[str]] = mapped_column(String(512))

    reported_priority: Mapped[Optional[int]] = mapped_column(Integer)  # 1 (critical) .. 5 (planning); None if the source has none
    reported_priority_label: Mapped[Optional[str]] = mapped_column(String(64))  # original value as shown in the source

    status: Mapped[str] = mapped_column(String(16), index=True)  # new, in_progress, on_hold, resolved, closed
    source_status: Mapped[Optional[str]] = mapped_column(String(32))
    assignment_group: Mapped[Optional[str]] = mapped_column(String(64))
    assignee: Mapped[Optional[str]] = mapped_column(String(128))
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)

    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    pipeline_status: Mapped[str] = mapped_column(String(32), index=True, default=PipelineStatus.PENDING)

    raw: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)  # untouched source row
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    agent_runs: Mapped[list["AgentRun"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="AgentRun.created_at"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan", order_by="Comment.created_at"
    )


class AgentRun(Base):
    """One agent's verdict on a ticket — the audit trail of the pipeline."""

    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    agent: Mapped[str] = mapped_column(String(32), index=True)  # data_quality, triage, resolution
    verdict: Mapped[str] = mapped_column(String(32))  # e.g. passed / failed, P2, resolved / no_match
    output: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    input_hash: Mapped[Optional[str]] = mapped_column(String(64))  # what the agent saw; a re-run is skipped if unchanged
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    ticket: Mapped[Ticket] = relationship(back_populates="agent_runs")


class Comment(Base):
    """A reply on a ticket. A reply from the reporter re-opens a ticket that is awaiting information."""

    __tablename__ = "ticket_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    author_email: Mapped[str] = mapped_column(String(256))
    from_reporter: Mapped[bool] = mapped_column(Boolean, default=False)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    ticket: Mapped[Ticket] = relationship(back_populates="comments")
