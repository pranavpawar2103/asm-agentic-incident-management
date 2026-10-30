"""Deterministic, explainable priority reassessment for incident tickets.

The initial triage agent deliberately does not call an LLM.  Priority decisions
need to be repeatable and auditable; ambiguous tickets retain their reported
priority rather than receiving an invented recommendation.
"""

from dataclasses import dataclass

from app.models.ticket import Ticket


@dataclass(frozen=True)
class TriageResult:
    """The recommendation and the evidence that produced it."""

    priority: int
    rule: str
    reason: str
    confidence: float


def _contains_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


def triage_ticket(ticket: Ticket) -> TriageResult:
    """Recommend a P1--P5 priority without changing the source ticket.

    Rules are ordered from highest-impact incident patterns to low-impact
    requests.  The final fallback preserves a valid reported priority, which
    makes the agent conservative when the ticket lacks enough evidence.
    """
    text = " ".join(filter(None, (ticket.summary, ticket.description))).lower()

    if _contains_any(text, ("data breach", "security incident", "ransomware", "unauthorised access")):
        return TriageResult(1, "security_incident", "Potential security incident requires immediate response.", 0.95)

    widespread = _contains_any(
        text,
        ("all users", "everyone", "company-wide", "multiple customers", "multiple users", "dropped to zero"),
    )
    outage = _contains_any(text, ("outage", "system down", "checkout down", "unavailable", "cannot access"))
    if widespread and outage:
        return TriageResult(1, "widespread_outage", "A service outage is affecting multiple users or customers.", 0.95)

    if _contains_any(text, ("salary file", "salary transfer", "monthly invoice run", "payment processing")) and _contains_any(
        text, ("failed", "not received", "error")
    ):
        return TriageResult(1, "time_critical_financial_process", "A time-critical payroll or billing process is blocked.", 0.92)

    if _contains_any(text, ("no new cases", "leads have appeared", "integration log", "customers not receiving")):
        return TriageResult(2, "business_workflow_disrupted", "A business workflow is disrupted beyond a single user.", 0.88)

    if _contains_any(text, ("feature request", "enhancement", "cosmetic", "typo", "profile photo")):
        return TriageResult(
            5,
            "non_incident_or_cosmetic",
            "The ticket describes a request or cosmetic issue, not a service incident.",
            0.9,
        )

    if _contains_any(text, ("dashboard numbers", "report formatting", "wrong colour", "visual")):
        return TriageResult(
            4,
            "low_impact_reporting_issue",
            "The issue is limited to reporting or presentation and no outage is described.",
            0.82,
        )

    if _contains_any(text, ("account locked", "unable to log in", "login is locked", "single user")):
        return TriageResult(
            3,
            "single_user_access_issue",
            "The ticket describes an individual access issue without wider impact.",
            0.88,
        )

    if ticket.reported_priority in range(1, 6):
        return TriageResult(
            ticket.reported_priority,
            "reported_priority_fallback",
            "No deterministic impact rule matched; retaining the source priority for human review.",
            0.55,
        )

    return TriageResult(
        3,
        "insufficient_impact_evidence",
        "The ticket has no reliable impact signal; defaulting to standard priority for review.",
        0.4,
    )
