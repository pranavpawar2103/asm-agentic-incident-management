"""Knowledge Builder: a resolved ticket whose close notes passed, saved with names masked so Resolution can learn from it."""

from datetime import UTC, datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class ResolvedCase(Base):
    """One good fix. All text is masked. match_status says whether a knowledge-base article covers it."""

    __tablename__ = "resolved_cases"

    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    application: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(Text)
    notes: Mapped[str] = mapped_column(Text)  # the final close notes: the engineer's edit if there was one
    cause: Mapped[Optional[str]] = mapped_column(Text)  # the words that showed the cause, action and check (Closure Quality)
    action: Mapped[Optional[str]] = mapped_column(Text)
    check: Mapped[Optional[str]] = mapped_column(Text)
    score: Mapped[Optional[int]] = mapped_column(Integer)  # out of 6
    match_status: Mapped[str] = mapped_column(String(16), index=True)  # matched | gap | uncertain
    kb_article_id: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    match_method: Mapped[Optional[str]] = mapped_column(String(16))  # cited | code | keywords | model
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
