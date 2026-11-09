"""Run the Resolution agent over tickets that are ready for it (REVIEWED) and record each answer as an agent_runs row."""

import logging
from collections import Counter
from dataclasses import asdict, dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.agents.resolution.case import CaseInput
from app.agents.resolution.embedding import Embedder
from app.agents.resolution.react import Resolution, prompt_versions, resolve
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.llm import ModelError
from app.models.ticket import AgentRun, PipelineStatus, Ticket
from app.services.data_quality import fingerprint, last_run, reporter_text

logger = logging.getLogger("app.resolution")

AGENT = "resolution"


@dataclass
class RunResult:
    evaluated: int = 0
    skipped: int = 0
    model_errors: int = 0
    by_verdict: Counter = field(default_factory=Counter)


def _input_hash(case: CaseInput, embedder: Embedder | None) -> str:
    """What the agent saw: a change to the ticket, the prompts, the model or the query embedder runs it again."""
    return fingerprint(case.summary, case.body, case.application, prompt_versions(), settings.LLM_MODEL,
                       embedder.model_name if embedder else "full-text")


def _output(res: Resolution, embedder: Embedder | None) -> dict:
    return {
        **res.answer.model_dump(),
        "filters": asdict(res.filters),
        "queries": res.queries,
        "hypothetical": res.hypothetical,
        "trace": res.trace,
        "audit": [asdict(a) for a in res.audits],
        "embedder": embedder.model_name if embedder else None,
    }


async def run_resolution(embedder: Embedder | None = None) -> RunResult:
    """Resolve every REVIEWED ticket. Tickets whose input has not changed since their last run are skipped.
    No database session is open while the model works. A ticket whose model call fails is left for the next run."""
    result = RunResult()
    todo: list[tuple[CaseInput, str]] = []
    async with AsyncSessionLocal() as db:
        tickets = (
            await db.scalars(
                select(Ticket)
                .where(Ticket.pipeline_status == PipelineStatus.REVIEWED)
                .options(selectinload(Ticket.agent_runs), selectinload(Ticket.comments))
            )
        ).all()
        for t in tickets:
            case = CaseInput(
                id=t.id, summary=t.summary, application=t.application, body=reporter_text(t),
                reporter_name=t.reporter_name, reporter_email=t.reporter_email, assignee=t.assignee,
            )
            digest = _input_hash(case, embedder)
            last = last_run(t, AGENT)
            if last is not None and last.input_hash == digest:
                result.skipped += 1
            else:
                todo.append((case, digest))

    for case, digest in todo:
        try:
            res = await resolve(case, embedder)
        except ModelError as exc:
            result.model_errors += 1
            logger.warning(f"Resolution: model failed for {case.id}: {exc!r}")
            continue
        async with AsyncSessionLocal() as db:
            db.add(AgentRun(ticket_id=case.id, agent=AGENT, verdict=res.answer.verdict, input_hash=digest,
                            output=_output(res, embedder)))
            await db.commit()
        result.evaluated += 1
        result.by_verdict[res.answer.verdict] += 1

    logger.info(
        f"Resolution: evaluated={result.evaluated} skipped={result.skipped} model_errors={result.model_errors} "
        f"by_verdict={dict(result.by_verdict)}"
    )
    return result
