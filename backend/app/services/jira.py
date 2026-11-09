"""Pull issues from Jira Cloud into servicenow_tickets, so every page and DQ rule sees them.

Read-only towards Jira. Uses the API token from the environment (ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN).
"""

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.jira import JiraProject, JiraSync
from app.models.servicenow import ServiceNowTicket
from app.privacy.masking import Masker

logger = logging.getLogger("app.jira")

# Same labels the ServiceNow sheet uses, so priority chips and DQ rules work unchanged.
PRIORITY = {"Highest": "1 - Critical", "High": "2 - High", "Medium": "3 - Moderate", "Low": "4 - Low", "Lowest": "5 - Planning"}
FIELDS = ["summary", "description", "priority", "status", "reporter", "components", "created", "resolutiondate", "project"]
MAX_ISSUES = 5000  # shortcut: one sync pulls at most this many issues; page by updated date if projects grow past it

sync_lock = asyncio.Lock()


class JiraError(RuntimeError):
    """Jira is not configured or answered with an error."""


def configured() -> bool:
    return bool(settings.ATLASSIAN_BASE_URL and settings.ATLASSIAN_EMAIL and settings.ATLASSIAN_API_TOKEN.get_secret_value())


def _client() -> httpx.AsyncClient:
    if not configured():
        raise JiraError("Jira is not set up: add ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN to backend/.env")
    return httpx.AsyncClient(
        base_url=settings.ATLASSIAN_BASE_URL.rstrip("/"),
        auth=(settings.ATLASSIAN_EMAIL, settings.ATLASSIAN_API_TOKEN.get_secret_value()),
        headers={"Accept": "application/json"},
        timeout=30,
    )


async def _get(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> Any:
    try:
        r = await client.request(method, url, **kwargs)
    except httpx.HTTPError as exc:
        raise JiraError(f"Couldn't reach Jira: {exc.__class__.__name__}") from exc
    if r.status_code in (401, 403):
        raise JiraError("Jira refused the API token: check ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN")
    if not r.is_success:
        raise JiraError(f"Jira answered {r.status_code} for {url}")
    return r.json()


async def whoami() -> str:
    async with _client() as c:
        return (await _get(c, "GET", "/rest/api/3/myself"))["displayName"]


async def list_projects() -> list[dict[str, str]]:
    async with _client() as c:
        data = await _get(c, "GET", "/rest/api/3/project/search", params={"maxResults": 100, "orderBy": "key"})
    return [{"key": p["key"], "name": p["name"]} for p in data["values"]]


async def search_issues(keys: list[str]) -> list[dict[str, Any]]:
    jql = f"project in ({', '.join(keys)}) ORDER BY updated DESC"
    issues: list[dict[str, Any]] = []
    token = None
    async with _client() as c:
        while len(issues) < MAX_ISSUES:
            body: dict[str, Any] = {"jql": jql, "fields": FIELDS, "maxResults": 100}
            if token:
                body["nextPageToken"] = token
            page = await _get(c, "POST", "/rest/api/3/search/jql", json=body)
            issues += page["issues"]
            token = page.get("nextPageToken")
            if page.get("isLast", True) or not token:
                break
    return issues


def adf_text(node: Any) -> str:
    """Plain text from a Jira description (Atlassian Document Format)."""
    if not isinstance(node, dict):
        return node if isinstance(node, str) else ""
    if node.get("type") == "text":
        return node.get("text", "")
    if node.get("type") == "hardBreak":
        return "\n"
    inner = "".join(adf_text(child) for child in node.get("content", []))
    return inner + "\n" if node.get("type") in {"paragraph", "heading", "listItem", "codeBlock"} else inner


def _when(value: str | None) -> datetime | None:
    # servicenow_tickets stores naive UTC
    return datetime.fromisoformat(value).astimezone(UTC).replace(tzinfo=None) if value else None


def map_issue(issue: dict[str, Any], team: str | None) -> dict[str, Any]:
    """Jira issue -> servicenow_tickets columns (before masking)."""
    f = issue["fields"]
    done = (f.get("status") or {}).get("statusCategory", {}).get("key") == "done"
    components = f.get("components") or []
    return dict(
        ticket_id=issue["key"],
        caller=(f.get("reporter") or {}).get("displayName"),
        short_description=f.get("summary"),
        description=adf_text(f.get("description")).strip() or None,
        priority=PRIORITY.get((f.get("priority") or {}).get("name", "")),
        assignment_group=team or (f.get("project") or {}).get("name"),
        service=components[0]["name"] if components else None,
        opened_at=_when(f.get("created")),
        closed_at=(_when(f.get("resolutiondate")) or datetime.now(UTC).replace(tzinfo=None)) if done else None,
    )


async def run_sync(db: AsyncSession, trigger: str) -> JiraSync:
    """Pull every issue of the selected projects and upsert them. DQ flags already set are kept."""
    if sync_lock.locked():
        raise JiraError("A sync is already running")
    async with sync_lock:
        projects = (await db.scalars(select(JiraProject).order_by(JiraProject.key))).all()
        run = JiraSync(trigger=trigger, projects=",".join(p.key for p in projects))
        db.add(run)
        await db.commit()
        try:
            if not projects:
                raise JiraError("No projects selected: pick at least one project first")
            teams = {p.key: p.team for p in projects}
            issues = await search_issues(list(teams))  # no transaction open while Jira answers
            rows = [map_issue(i, teams.get(i["key"].split("-")[0])) for i in issues]
            if settings.PII_MASKING_ENABLED:
                masker = Masker(known_names=[r["caller"] for r in rows])
                for r in rows:
                    for k in ("caller", "short_description", "description"):
                        if r[k]:
                            r[k] = str(masker.mask(r[k]))
            ids = [r["ticket_id"] for r in rows]
            found = await db.scalars(select(ServiceNowTicket).where(ServiceNowTicket.ticket_id.in_(ids)))
            existing = {t.ticket_id: t for t in found}
            for r in rows:
                if (t := existing.get(r["ticket_id"])) is not None:
                    for k, v in r.items():
                        setattr(t, k, v)
                    run.updated += 1
                else:
                    db.add(ServiceNowTicket(**r, dq_flag=False))
                    run.created += 1
            run.pulled = len(rows)
        except Exception as exc:
            await db.rollback()  # nothing from this sync is kept
            await db.refresh(run)
            if isinstance(exc, JiraError):
                run.error = str(exc)
                logger.warning("Jira sync %s: %s", run.id, exc)
            else:
                run.error = f"Sync failed: {exc.__class__.__name__}"
                logger.exception("Jira sync %s failed", run.id)
        run.finished_at = datetime.now(UTC)
        db.add(run)
        await db.commit()
        logger.info("Jira sync %s: pulled=%s created=%s updated=%s", run.id, run.pulled, run.created, run.updated)
        return run


async def schedule_loop(session_factory) -> None:
    """Sync every JIRA_SYNC_MINUTES while the app runs."""
    while True:
        await asyncio.sleep(settings.JIRA_SYNC_MINUTES * 60)
        try:
            async with session_factory() as db:
                await run_sync(db, "schedule")
        except JiraError as exc:
            logger.info("Scheduled Jira sync skipped: %s", exc)
