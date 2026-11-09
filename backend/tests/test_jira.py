"""Jira pull: issue mapping and the sync endpoints, with Jira itself faked."""

import pytest

from app.services import jira

ISSUE = {
    "key": "AMS-7",
    "fields": {
        "summary": "Payroll export fails",
        "description": {"type": "doc", "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Export stops at 40%."}]},
            {"type": "paragraph", "content": [
                {"type": "text", "text": "Since Monday"}, {"type": "hardBreak"}, {"type": "text", "text": "for all users."},
            ]},
        ]},
        "priority": {"name": "High"},
        "status": {"name": "Done", "statusCategory": {"key": "done"}},
        "reporter": {"displayName": "Jane Doe"},
        "components": [{"name": "PayrollPro"}],
        "created": "2026-11-01T09:30:00.000-0500",
        "resolutiondate": "2026-11-02T10:00:00.000+0000",
        "project": {"key": "AMS", "name": "AMS Support"},
    },
}


def test_adf_text_keeps_paragraphs_and_breaks():
    assert jira.adf_text(ISSUE["fields"]["description"]).strip() == "Export stops at 40%.\nSince Monday\nfor all users."
    assert jira.adf_text(None) == ""


def test_map_issue():
    row = jira.map_issue(ISSUE, None)
    assert row["ticket_id"] == "AMS-7"
    assert row["priority"] == "2 - High"
    assert row["service"] == "PayrollPro"
    assert row["assignment_group"] == "AMS Support"  # no team picked: project name
    assert row["opened_at"].isoformat() == "2026-11-01T14:30:00"  # naive UTC
    assert row["closed_at"].isoformat() == "2026-11-02T10:00:00"
    assert jira.map_issue(ISSUE, "AMS-Finance")["assignment_group"] == "AMS-Finance"
    fields = {**ISSUE["fields"], "status": {"statusCategory": {"key": "new"}}, "components": [], "priority": None}
    open_issue = {"key": "AMS-8", "fields": fields}
    row = jira.map_issue(open_issue, None)
    assert row["closed_at"] is None and row["service"] is None and row["priority"] is None


@pytest.fixture
def fake_jira(monkeypatch):
    async def search(keys):
        assert keys == ["AMS"]
        return [ISSUE]
    monkeypatch.setattr(jira, "search_issues", search)
    monkeypatch.setattr(jira.settings, "PII_MASKING_ENABLED", False)


async def test_sync_without_projects_is_recorded_as_failed(client):
    r = await client.post("/api/v1/jira/sync")
    assert r.status_code == 200
    assert r.json()["error"].startswith("No projects selected")


async def test_sync_creates_then_updates(client, fake_jira):
    r = await client.put("/api/v1/jira/projects", json=[{"key": "AMS", "name": "AMS Support", "team": "AMS-Finance"}])
    assert r.status_code == 200
    first = (await client.post("/api/v1/jira/sync")).json()
    assert (first["pulled"], first["created"], first["updated"], first["error"]) == (1, 1, 0, None)
    second = (await client.post("/api/v1/jira/sync")).json()
    assert (second["created"], second["updated"]) == (0, 1)
    history = (await client.get("/api/v1/jira/syncs")).json()
    assert [h["id"] for h in history] == [second["id"], first["id"]]
    ticket = (await client.get("/api/v1/servicenow/tickets/AMS-7")).json()
    assert ticket["assignment_group"] == "AMS-Finance" and ticket["priority"] == "2 - High"


async def test_project_key_is_validated(client):
    r = await client.put("/api/v1/jira/projects", json=[{"key": "ams) OR 1=1", "name": "x"}])
    assert r.status_code == 422
