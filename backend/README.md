# Backend

FastAPI service that ingests tickets from all sources, stores them in PostgreSQL (Supabase) and runs the agent pipeline over them.

## Structure

```text
backend/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/
│   │   │   ├── health.py      # GET  /api/v1/health
│   │   │   ├── hello.py       # GET  /api/v1/hello (template smoke test)
│   │   │   ├── data_quality.py # POST /api/v1/data-quality/run
│   │   │   └── tickets.py     # ingest, list, detail, POST /api/v1/tickets/{id}/comments
│   │   └── router.py          # Versioned route aggregator
│   ├── core/                  # Settings, logging, middleware, exception handlers
│   ├── db/session.py          # Engine, session factory, get_db dependency
│   ├── agents/data_quality/   # Rules stage: signals, rules, config from data/registry
│   ├── privacy/masking.py     # Presidio PII masking before any model call, and unmasking after
│   ├── models/ticket.py       # Ticket, AgentRun (audit trail), Comment (replies), PipelineStatus
│   ├── schemas/               # Pydantic request/response models
│   ├── services/              # ingestion, data_quality (runs the agent), comments
│   └── main.py                # App factory and lifespan
├── tests/                     # pytest; conftest.py gives each test an in-memory database
├── Dockerfile
├── pyproject.toml             # Project metadata, pytest and ruff config
├── requirements.txt           # Runtime dependencies
└── requirements-dev.txt       # + test and lint tools
```

Agents in `app/agents/` are pure logic; `app/services/` loads tickets, runs them and records the results.

## Documentation

For architectural patterns, database standards (Supabase/PostgreSQL async conventions), and guidelines for building agent workflows, refer to [DEVELOPMENT.md](DEVELOPMENT.md).

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Then load the tickets once with `POST http://localhost:8000/api/v1/ingest` (or from Swagger at `http://localhost:8000/api/v1/docs`).

## Run with Docker

From the repo root: `docker compose up --build`. The repo's `data/` folder is mounted read-only at `/data`, and the database is kept in a named volume.

## Tests and lint

```bash
pytest
ruff check .
```
