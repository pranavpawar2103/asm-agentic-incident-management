# DB scripts

Plain SQL (PostgreSQL / Supabase) to run from a workbench (Supabase SQL Editor, pgAdmin, DBeaver, DataGrip).
Run in numeric order.

| Script | Purpose |
|---|---|
| `01_create_servicenow_tickets.sql` | Create `servicenow_tickets` with data quality flag (idempotent) |
| `02_create_dq_rules.sql` | Create `dq_rules`, `dq_runs`, `dq_run_tickets` (idempotent) |
| `99_drop_tables.sql` | Drop all tables (destructive, dev only) |

Add new changes as the next number, e.g. `02_add_<change>.sql`.
