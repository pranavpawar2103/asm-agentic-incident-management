"""Score the Triage rules stage against the answer key.

Usage, from the repo root:  python evaluation/triage_report.py
Two sets, open and closed tickets alike, every ticket with an expected priority:
  tuning    JIRA and Mailbox (ams_tickets.xlsx); the rules were written while looking at these
  held-out  ServiceNow (servicenow_tickets.xlsx); not used to write the rules, so the fairer score
"""

import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from app.agents.triage.rules import evaluate  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.db.session import Base  # noqa: E402
from app.models.ticket import Ticket  # noqa: E402
from app.services.ingestion import ingest_workbook  # noqa: E402


def answer_key() -> dict[str, dict]:
    rows = load_workbook(REPO / "evaluation" / "ground_truth.xlsx", read_only=True).active.iter_rows(values_only=True)
    header = next(rows)
    return {r[0]: dict(zip(header, r)) for r in rows}


def tuning_set() -> list[Ticket]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        ingest_workbook(db, settings.TICKETS_FILE)
        return db.query(Ticket).order_by(Ticket.id).all()


def held_out_set() -> list[Ticket]:
    workbook = load_workbook(REPO / "data" / "tickets" / "servicenow_tickets.xlsx", read_only=True)
    rows = workbook["servicenow_tickets"].iter_rows(values_only=True)
    header = next(rows)
    return [
        Ticket(id=r["ticket_id"], summary=r["short_description"] or "", description=r["description"] or "",
               application=r["service"], reported_priority=int(r["priority"][0]) if r["priority"] else None,
               opened_at=datetime.fromisoformat(str(r["opened_at"])) if r["opened_at"] else None)
        for r in (dict(zip(header, row)) for row in rows)
    ]


def main() -> None:
    key = answer_key()
    for title, tickets in [("TUNING SET: JIRA + Mailbox", tuning_set()), ("HELD-OUT SET: ServiceNow", held_out_set())]:
        scored = [t for t in tickets if t.id in key and key[t.id]["expected_priority"]]
        print(f"\n===== {title} =====")
        report([(t, evaluate(t.summary, t.description, t.application, t.opened_at)) for t in scored], key)


def report(results: list, key: dict[str, dict]) -> None:
    decided = [(t, r) for t, r in results if r.priority]
    correct = [(t, r) for t, r in decided if r.priority == key[t.id]["expected_priority"]]
    mismatch = [(t, r) for t, r in results if key[t.id]["scenario"] == "priority_mismatch"]
    per_app = defaultdict(lambda: [0, 0, 0])  # decided, correct, total
    for t, r in results:
        stats = per_app[key[t.id]["expected_application"] or "(none)"]
        stats[0] += bool(r.priority)
        stats[1] += r.priority == key[t.id]["expected_priority"]
        stats[2] += 1

    print(f"Tickets with an expected priority  {len(results)}")
    print(f"Decided by the rules               {len(decided)}")
    print(f"  correct                          {len(correct)} / {len(decided)}")
    print(f"  too high (more urgent)           {sum(r.priority < key[t.id]['expected_priority'] for t, r in decided)}")
    print(f"  too low                          {sum(r.priority > key[t.id]['expected_priority'] for t, r in decided)}")
    print(f"Left for the model                 {len(results) - len(decided)}")
    fallback = [(t, r) for t, r in results if not r.priority and r.fallback]
    print(f"  model off, rules' own answer     {sum(r.fallback.priority == key[t.id]['expected_priority'] for t, r in fallback)}"
          f" / {len(fallback)} correct (leaning high when a P1/P2 is possible); "
          f"{len(results) - len(decided) - len(fallback)} stay undecided")
    fixed = sum(r.priority == key[t.id]["expected_priority"] for t, r in mismatch)
    print(f"Reporter priority wrong, fixed     {fixed} / {len(mismatch)}")
    print("\nPer application (decided, correct / total):")
    for app, (d, c, n) in sorted(per_app.items()):
        print(f"  {app:<18} {d:>2} decided, {c:>2} correct / {n}")

    for title, items in [
        ("Wrong priority", [(t, r) for t, r in decided if (t, r) not in correct]),
        ("Left for the model", [(t, r) for t, r in results if not r.priority]),
    ]:
        if items:
            print(f"\n{title}:")
            for t, r in items:
                print(f"  {t.id:<11} got={r.verdict:<9} expected=P{key[t.id]['expected_priority']} "
                      f"reported={t.reported_priority}  {r.reason}")


if __name__ == "__main__":
    main()
