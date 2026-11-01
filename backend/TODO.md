# TODO: Data Quality Rules and Masking

Context: [db/scripts/DQ_RULES_FEATURE.md](db/scripts/DQ_RULES_FEATURE.md), [DEVELOPMENT.md](DEVELOPMENT.md) in both frontend and backend folders

| # | Task | Owner | Depends on | Status |
|---|---|---|---|---|
| 1 | Review DB scripts and the DQ rules feature notes | DONE | none | Open |
| 2 | Create dummy data for the ServiceNow schema, covering the DQ rules | TBD | 1 | Open |
| 3 | Create API endpoints | TBD | 1 | Open |
| 4 | Add Microsoft Presidio masking, run as a Celery worker with RabbitMQ | TBD | none (feeds 2 and 3) | Open |
| 5 | Update the UI for DQ rule configuration | TBD | 3 | Open |
| 6 | Add schemas for different ticket sources as well | TBD | none | Open |

## 1. Review DB scripts and feature notes
- Review [01_create_servicenow_tickets.sql](db/scripts/01_create_servicenow_tickets.sql) and [02_create_dq_rules.sql](db/scripts/02_create_dq_rules.sql). Run them on a dev database to verify.
- Answer the open questions in `DQ_RULES_FEATURE.md` (revert order, per-source fields, rule edit history, `dq_reason` with several matches).
- Done when: scripts approved, or follow-up scripts (`03_...`) agreed.

## 2. Dummy data
- Rows in the AMS team's ServiceNow schema, as a SQL script in `db/scripts/` (e.g. `03_seed_servicenow_tickets.sql`).
- Cover each operator and `apply_to` case: short or empty descriptions, `test` tickets, blank fields, unresolved (`closed_at` NULL) and closed tickets, several services and priorities (e.g. `4 - Low`).
- Include a few sample `dq_rules` and tickets that should and should not match.
- Done when: applying the sample rules gives a known, documented set of flagged tickets.

## 3. API endpoints
- Needs the models and services updated first (`app/models/ticket.py` still defines the old tables).
- Rules: create, list, get, edit, toggle enabled, soft delete.
- Apply: run on existing, new or both; list runs; show a run's matches; revert a run.
- Tickets: list with the DQ flag and reason, filterable.
- Follow the async conventions in [DEVELOPMENT.md](DEVELOPMENT.md).
- Done when: endpoints are covered by tests against the dummy data.

## 4. Presidio masking (Celery and RabbitMQ)
- Mask `caller`, descriptions and resolution notes before the ticket is stored.
- Celery worker with RabbitMQ as the broker. Add the settings to `.env.example` and the services to `docker-compose.yml`.
- Follow the redaction plan in [architectures/data-quality.html](../architectures/data-quality.html) (Presidio with spaCy, keep-list for order/invoice/SKU identifiers, allow-list for application names).
- Open: whether to store reversible tokens (a `redaction_tokens` table was left out for now).
- Done when: no caller name or email survives in stored tickets, checked on the dummy data.

## 5. UI for rule configuration
- Rule list with enable toggle, create, edit and delete.
- Choose field, operator, value, source or service, and when to apply (existing, new, both).
- Apply button, run history, and revert.
- Done when: all of the above work against the API from item 3.
