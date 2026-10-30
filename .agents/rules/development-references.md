# Agent Development References & Guidelines

When working on tasks in this repository, you MUST consult the relevant development guide(s) before proposing or implementing changes:

1. **Backend Development**:
   - Primary guide: `backend/DEVELOPMENT.md`
   - Covers FastAPI conventions, strict async paradigm with `asyncpg`, SQLAlchemy 2.0 on-demand sessions, Supabase integration, and error handling.

2. **Database Scripts & Schema Migrations**:
   - Primary guide: `backend/db/scripts/DEVELOPMENT.md`
   - Covers SQL migration ordering and idempotency.
   - For Data Quality (DQ) feature work, the `dq-rules-workflow` skill will activate on-demand.

3. **Frontend Development**:
   - Primary guide: `frontend/DEVELOPMENT.md`
   - Covers Next.js App Router patterns, shadcn/ui components (`src/components/ui/`), API client integration, and build verification (`npm run build`).
