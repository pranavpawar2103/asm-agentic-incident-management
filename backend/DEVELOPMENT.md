# Backend Development Guide for AI Agents & Engineers

This document provides architecture conventions, standards, and guidelines for developing backend services, database interactions, and agent pipelines in this repository.

---

## 1. Tech Stack & Core Architecture

- **Framework**: FastAPI (async ASGI)
- **Database Engine**: PostgreSQL (hosted on Supabase)
- **Database Driver**: `asyncpg` (`postgresql+asyncpg://...`)
- **ORM / Query Builder**: SQLAlchemy 2.0 (pure async paradigm)
- **Validation & Settings**: Pydantic v2 & `pydantic-settings`
- **Package Management**: `pip` / `requirements.txt` / `pyproject.toml`

---

## 2. Database Standards & Supabase Integration

### Connection Paradigm: Pure Async

- **Driver**: All database communication must strictly use `asyncpg`. Never use blocking drivers (`psycopg2`, synchronous sqlite, etc.) in production paths.
- **Connection Strings**:
  - Direct connection:
    ```bash
    DATABASE_URL="postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
    ```
  - Supabase Connection Pooler (Supavisor / Transaction mode):
    ```bash
    DATABASE_URL="postgresql+asyncpg://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
    ```

### Session Lifecycle & Safety Rules

1. **No Auto Schema Generation on Startup**:
   - `Base.metadata.create_all` is deliberately **not** called on application startup in `lifespan`.
   - Table schemas, migrations, indexes, and triggers must be created deliberately via migrations or Supabase SQL Editor / CLI.
2. **On-Demand Scoped Sessions**:
   - Database sessions must never be held persistently across the lifecycle of an application or module.
   - Use the `get_db()` async generator dependency in FastAPI endpoints or context managers:
     ```python
     from app.db.session import get_db
     from sqlalchemy.ext.asyncio import AsyncSession

     @router.get("/endpoint")
     async def my_endpoint(db: AsyncSession = Depends(get_db)):
         ...
     ```
   - Every session is created on-demand and closed explicitly in its `finally` block:
     ```python
     async def get_db() -> AsyncIterator[AsyncSession]:
         async with AsyncSessionLocal() as session:
             try:
                 yield session
             finally:
                 await session.close()
     ```
3. **Application Lifespan Graceful Cleanup**:
   - Connection pools are disposed of in [`app/main.py`](file:///Users/bhimk/Personal_Repos/AMS_Agent/asm-agentic-incident-management/backend/app/main.py) inside a `try...finally` block to prevent resource leaks during unexpected terminations:
     ```python
     @asynccontextmanager
     async def lifespan(app: FastAPI):
         setup_logging()
         logger.info(f"Starting {settings.PROJECT_NAME} [{settings.ENVIRONMENT}]")
         try:
             yield
         finally:
             logger.info(f"Shutting down {settings.PROJECT_NAME}")
             await close_db()
     ```

### Database Scripts (`db/scripts/`)

Schema is managed by plain SQL scripts that run from a workbench (Supabase SQL Editor, pgAdmin, DBeaver). See [`db/scripts/README.md`](db/scripts/README.md).

- Run in numeric order: `01_create_servicenow_tickets.sql`, then `02_create_dq_rules.sql`. Scripts are idempotent (`IF NOT EXISTS`). `99_drop_tables.sql` is destructive, dev only.
- Add each schema change as the next numbered script (e.g. `03_add_<change>.sql`). Do not edit applied scripts.
- Tables:
  - `servicenow_tickets`: tickets in the AMS team's schema, plus `dq_flag` / `dq_reason`. Tickets are always stored; the flag marks them as filtered out by data quality rules.
  - `dq_rules`: user-managed rules (`field`, `operator`, `value`, optional `source` / `service`, `apply_to` = existing/new/both, `is_enabled` toggle, soft delete via `deleted_at`).
  - `dq_runs`, `dq_run_tickets`: history of rule applies, and per ticket flagged by a run the matching `rule_id` (first match wins) plus `reverted_dq_flag` / `reverted_dq_reason` (restored when the run is reverted).
- Design notes, assumptions and open questions: [`db/scripts/DQ_RULES_FEATURE.md`](db/scripts/DQ_RULES_FEATURE.md).
- Known gap: `app/models/ticket.py` still defines the older `tickets` / `agent_runs` tables and does not match these scripts yet. Update the models and services before using the new tables from code.

---

## 3. Developing Agents & Services

When building agent workers (e.g., triage, data quality, resolution):

1. **Async by Default**:
   Agent orchestration steps and tool executions that query or mutate database records must use `await session.execute(...)`, `await session.get(...)`, and `await session.commit()`.
2. **Session Scope for Long-Running Tasks / Background Agents**:
   - Do **not** pass a single session into a long-running batch agent process.
   - For long-running worker loops, instantiate isolated scoped sessions via `async with AsyncSessionLocal() as session:` for each unit of work (e.g., per ticket analysis), and commit/close immediately.
3. **Audit Trail**:
   Every agent action should record an entry to the audit log (`agent_runs`) referencing the ticket and logging output verdicts with execution timestamps.

---

## 4. Configuration Reference

Database settings are configured in [`app/core/config.py`](file:///Users/bhimk/Personal_Repos/AMS_Agent/asm-agentic-incident-management/backend/app/core/config.py) and populated via `.env`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://...` |
| `DB_POOL_SIZE` | SQLAlchemy connection pool size | `5` |
| `DB_MAX_OVERFLOW` | Max extra overflow connections | `10` |
| `DB_POOL_PRE_PING`| Validates connection health before checkout | `True` |
| `DB_ECHO` | Print SQL statements to log (debug only) | `False` |

---

## 5. Development Checklist for Agents

When implementing new endpoints, services, or agent tasks:
- [ ] Ensure new models subclass `Base` from `app.db.session`.
- [ ] Avoid `run_sync` or synchronous database calls in async request paths.
- [ ] Explicitly commit transactions (`await db.commit()`) or rollback on error (`await db.rollback()`).
- [ ] Use `select()`, `update()`, and `delete()` SQLAlchemy 2.0 executable statements.
- [ ] Keep `.env.example` updated when introducing new environment variables.
