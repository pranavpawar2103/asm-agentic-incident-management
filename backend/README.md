# Backend

FastAPI service that ingests tickets from all sources, stores them in SQLite and (next) runs the agent pipeline over them.

## Structure

```text
backend/
├── app/
│   ├── api/v1/
│   │   ├── endpoints/
│   │   │   ├── health.py      # GET  /api/v1/health
│   │   │   ├── hello.py       # GET  /api/v1/hello (template smoke test)
│   │   │   └── tickets.py     # POST /api/v1/ingest, GET /api/v1/tickets, GET /api/v1/tickets/{id}
│   │   └── router.py          # Versioned route aggregator
│   ├── core/                  # Settings, logging, middleware, exception handlers
│   ├── db/session.py          # Engine, session factory, get_db dependency
│   ├── models/ticket.py       # Ticket (common format) and AgentRun (audit trail)
│   ├── schemas/               # Pydantic request/response models
│   ├── services/ingestion.py  # ServiceNow / JIRA / Mailbox -> common Ticket format
│   └── main.py                # App factory and lifespan
├── tests/                     # pytest; conftest.py gives each test an in-memory database
├── Dockerfile
├── pyproject.toml             # Project metadata, pytest and ruff config
├── requirements.txt           # Runtime dependencies
└── requirements-dev.txt       # + test and lint tools
```

Agents will live in `app/agents/` and read and write tickets through `app/services/`.

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
