"""Run the Triage agent over tickets that passed Data Quality and record each recommended priority."""

import logging
from collections import Counter
from dataclasses import asdict, dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.agents.triage.config import get_config
from app.agents.triage.model_check import TriageAssessment, assess_priority, triage_priority_spec, verified
from app.agents.triage.rules import Decision, Facts, RuleResult, decide, evaluate, find_rule, without_rulebook
from app.agents.triage.signals import clean_text
from app.agents.triage.verdict import Verdict
from app.core.config import settings
from app.llm import CallAudit, ModelError
from app.models.ticket import AgentRun, PipelineStatus, Ticket
from app.services.data_quality import OutageBreaker, fingerprint, last_run, reporter_text

logger = logging.getLogger("app.triage")

AGENT = "triage"


@dataclass
class RunResult:
    evaluated: int = 0
    skipped: int = 0
    model_errors: int = 0
    needs_review: int = 0
    by_verdict: Counter = field(default_factory=Counter)


def _input_hash(ticket: Ticket, body: str) -> str:
    """What the triage saw: a change to the ticket, the rulebook, or the model and its prompt re-triages it."""
    stages = f"{settings.LLM_MODEL}|{triage_priority_spec().prompt_version}" if settings.LLM_ENABLED else "rules"
    return fingerprint(ticket.summary, body, ticket.application, str(ticket.opened_at), get_config().version, stages)


def _recommendation(ticket: Ticket, decision: Decision | None, reason: str, ai: str) -> dict:
    """The reporter's priority is never changed. Large shifts, lowered P1/P2s and guesses are flagged for review."""
    priority, reported = (decision.priority if decision else None), ticket.reported_priority
    shift = priority - reported if priority and reported else None
    downgrade = shift is not None and reported <= 2 and shift > 0
    leaned = bool(decision and decision.leaned_high)
    kept = bool(decision and decision.kept_reported)
    return {
        "priority": priority,
        "reported_priority": reported,
        "shift": shift,
        "downgrade": downgrade,
        "leaned_high": leaned,
        "needs_review": downgrade or leaned or kept or (shift is not None and abs(shift) > get_config().review_shift),
        "rule": decision.rule if decision else None,
        "must_follow": decision.must_follow if decision else None,
        "reason": reason,
        "ai": ai,  # not_needed | used | off | failed
    }


def model_decision(ticket: Ticket, body: str, outcome: RuleResult) -> tuple[Decision, TriageAssessment, list[str], CallAudit]:
    """Ask the model for the missing facts, drop any it cannot quote, and calculate the priority from the rulebook.
    Raises app.llm.ModelError when there is no usable answer."""
    config = get_config()
    answer, audit = assess_priority(ticket, body, outcome)
    answer, dropped = verified(answer, f"{ticket.summary}\n{body}")
    s = outcome.signals
    facts = Facts(answer.application, answer.scope, s.windows, s.failed_jobs, lambda _: answer.context_applies)
    rule = find_rule(config, answer.application, answer.rule)  # checked by TriageAssessment
    decision = decide(rule, facts, clean_text(ticket.summary, body, config), config)
    if answer.application is None:
        decision = without_rulebook(decision, ticket.reported_priority)
    return decision, answer, dropped, audit


def triage_ticket(db: Session, ticket: Ticket, use_model: bool = True) -> tuple[AgentRun, ModelError | None]:
    """Rules first; the model once for tickets the rules cannot settle. Without a usable model answer the rules'
    own answer (leaning high) is used. Returns the final run and the model error, if there was one."""
    config = get_config()
    body = reporter_text(ticket)
    outcome = evaluate(ticket.summary, body, ticket.application, ticket.opened_at)
    rules_output = {"stage": "rules", "rules_version": config.version, "missing": list(outcome.missing),
                    "signals": asdict(outcome.signals)}
    final = AgentRun(ticket_id=ticket.id, agent=AGENT, verdict=outcome.verdict, input_hash=_input_hash(ticket, body),
                     output={**rules_output, **_recommendation(ticket, outcome.decision, outcome.reason, "not_needed")})
    db.add(final)
    if outcome.verdict != Verdict.UNCERTAIN:
        ticket.pipeline_status = PipelineStatus.TRIAGED
        return final, None

    error, ai = None, "off"
    if settings.LLM_ENABLED and use_model:
        try:
            decision, answer, dropped, audit = model_decision(ticket, body, outcome)
        except ModelError as exc:
            error, ai = exc, "failed"
        else:
            final = AgentRun(
                ticket_id=ticket.id, agent=AGENT, verdict=Verdict.of(decision.priority), input_hash=final.input_hash,
                output={"stage": "model", "rules_version": config.version,
                        **_recommendation(ticket, decision, decision.reason, "used"),
                        "answer": answer.model_dump(), "dropped_facts": dropped, "audit": asdict(audit)},
            )
            db.add(final)

    if final.verdict == Verdict.UNCERTAIN:
        if outcome.fallback:
            final.verdict = Verdict.of(outcome.fallback.priority)
            final.output = {**rules_output, **_recommendation(ticket, outcome.fallback, outcome.fallback.reason, ai)}
        elif error:
            final.input_hash = None  # nothing to fall back on: try again on the next run
    if final.verdict != Verdict.UNCERTAIN:
        ticket.pipeline_status = PipelineStatus.TRIAGED
    return final, error


def run_triage(db: Session) -> RunResult:
    """Triage every ticket that passed Data Quality. Tickets whose input has not changed since their last triage are skipped."""
    tickets = db.scalars(
        select(Ticket)
        .where(Ticket.pipeline_status == PipelineStatus.DQ_PASSED)
        .options(selectinload(Ticket.agent_runs), selectinload(Ticket.comments))
    ).all()

    result = RunResult()
    breaker = OutageBreaker(settings.TRIAGE_OUTAGE_BREAKER)
    use_model = True
    for ticket in tickets:
        last = last_run(ticket, AGENT)
        if last is not None and last.input_hash == _input_hash(ticket, reporter_text(ticket)):
            result.skipped += 1
            continue

        agent_run, error = triage_ticket(db, ticket, use_model)
        if error:
            result.model_errors += 1
            logger.warning(f"Triage: model stage failed for {ticket.id}: {error!r}")
        if use_model and agent_run.output["ai"] in ("used", "failed") and breaker.record(error):
            logger.error(f"Triage: model unavailable {breaker.in_a_row} times in a row; rules only for the rest of this run")
            use_model = False
        result.evaluated += 1
        result.needs_review += agent_run.output["needs_review"]
        result.by_verdict[agent_run.verdict] += 1
    db.commit()

    logger.info(
        f"Triage: evaluated={result.evaluated} skipped={result.skipped} model_errors={result.model_errors} "
        f"needs_review={result.needs_review} by_verdict={dict(result.by_verdict)}"
    )
    return result
