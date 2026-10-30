"""Unit tests for deterministic triage rules."""

import pytest

from app.agents.triage import triage_ticket
from app.models.ticket import Ticket


@pytest.mark.parametrize(
    ("summary", "description", "reported_priority", "priority", "rule"),
    [
        (
            "Website checkout down",
            "Checkout is unavailable for all users.",
            4,
            1,
            "widespread_outage",
        ),
        (
            "Support emails not creating cases",
            "Since Monday no new cases are created and case volume dropped to zero.",
            4,
            2,
            "business_workflow_disrupted",
        ),
        (
            "Profile photo is cropped",
            "Please fix this cosmetic issue.",
            1,
            5,
            "non_incident_or_cosmetic",
        ),
    ],
)
def test_triage_reassesses_priority(summary, description, reported_priority, priority, rule):
    ticket = Ticket(
        id="TEST-1",
        source="JIRA",
        summary=summary,
        description=description,
        status="new",
        pipeline_status="pending",
        reported_priority=reported_priority,
    )

    result = triage_ticket(ticket)

    assert result.priority == priority
    assert result.rule == rule


def test_triage_preserves_reported_priority_when_evidence_is_ambiguous():
    ticket = Ticket(
        id="TEST-2",
        source="JIRA",
        summary="Unexpected application error",
        description="Please investigate.",
        status="new",
        pipeline_status="pending",
        reported_priority=3,
    )

    result = triage_ticket(ticket)

    assert result.priority == 3
    assert result.rule == "reported_priority_fallback"
