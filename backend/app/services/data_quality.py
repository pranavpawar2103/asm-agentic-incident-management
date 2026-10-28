"""Run the Data Quality agent over pending tickets and record each verdict."""

import hashlib
import logging
from collections import Counter
from dataclasses import asdict, dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.agents.data_quality.rules import Verdict, evaluate
from app.models.ticket import AgentRun, PipelineStatus, Ticket

logger = logging.getLogger("app.data_quality")

AGENT = "data_quality"
VERDICT_STATUS = {
    Verdict.NOT_AN_INCIDENT: PipelineStatus.REJECTED,
    Verdict.NEEDS_INFO: PipelineStatus.AWAITING_INFO,
}  # uncertain keeps the ticket pending until the model step decides


@dataclass
class RunResult:
    evaluated: int = 0
    skipped: int = 0
    by_verdict: Counter = field(default_factory=Counter)


def _body_with_replies(ticket: Ticket) -> str:
    """The original description followed by every reply from the reporter, so a re-check sees the full story."""
    return "\n\n".join([ticket.description, *(c.body for c in ticket.comments if c.from_reporter)])


def _hash(*parts: str | None) -> str:
    return hashlib.sha256("\x1f".join(p or "" for p in parts).encode()).hexdigest()


def run_data_quality(db: Session) -> RunResult:
    """Check every pending ticket. Tickets whose input has not changed since their last check are skipped."""
    tickets = db.scalars(
        select(Ticket)
        .where(Ticket.pipeline_status == PipelineStatus.PENDING)
        .options(selectinload(Ticket.agent_runs), selectinload(Ticket.comments))
    ).all()

    result = RunResult()
    for ticket in tickets:
        body = _body_with_replies(ticket)
        input_hash = _hash(ticket.summary, body, ticket.attachments, ticket.application)
        last = next((r for r in reversed(ticket.agent_runs) if r.agent == AGENT), None)
        if last is not None and last.input_hash == input_hash:
            result.skipped += 1
            continue

        outcome = evaluate(ticket.summary, body, ticket.attachments, ticket.application)
        db.add(AgentRun(
            ticket_id=ticket.id,
            agent=AGENT,
            verdict=outcome.verdict,
            input_hash=input_hash,
            output={"stage": "rules", "rule": outcome.rule, "reason": outcome.reason, "signals": asdict(outcome.signals)},
        ))
        ticket.pipeline_status = VERDICT_STATUS.get(outcome.verdict, ticket.pipeline_status)
        result.evaluated += 1
        result.by_verdict[outcome.verdict] += 1
    db.commit()

    logger.info(f"Data Quality: evaluated={result.evaluated} skipped={result.skipped} by_verdict={dict(result.by_verdict)}")
    return result
