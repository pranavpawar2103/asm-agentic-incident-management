# Production-Ready FastAPI Template

Clean, production-grade boilerplate for FastAPI services with health checks, request logging middleware, environment configuration, and containerization.

## Features

- **Pydantic v2 & `pydantic-settings`**: Typed configuration from environment variables or `.env`.
- **FastAPI Lifespan Management**: Modern async startup & shutdown hooks.
- **Middleware**: Automatic `X-Request-ID` tracing and request latency tracking (`X-Process-Time-Ms`).
- **Global Error Handling**: Uniform JSON error responses.
- **Production Dockerfile**: Multi-stage lightweight build with non-root user.
- **Testing**: Pre-configured `pytest` with `httpx` async test client.

---

## Project Structure

```text
.
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── health.py    # GET /api/v1/health
│   │       │   └── hello.py     # GET /api/v1/hello ("hello there")
│   │       └── router.py        # Versioned route aggregator
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings
│   │   ├── exceptions.py        # Centralized exception handlers
│   │   ├── logging.py           # Standardized logger setup
│   │   └── middleware.py        # Request ID & latency middleware
│   ├── schemas/
│   │   └── common.py            # Pydantic response models
│   └── main.py                  # App entry point & lifespan factory
├── tests/
│   └── test_api.py              # Async endpoint unit tests
├── .env.example
├── Dockerfile
└── requirements.txt
```

---

## Quickstart

### 1. Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### 2. Run Locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Greeting API**: `http://localhost:8000/api/v1/hello`
- **Health Check**: `http://localhost:8000/api/v1/health`
- **Interactive Swagger Docs**: `http://localhost:8000/api/v1/docs` (active in debug/dev)

### 3. Run Tests

```bash
pytest
```
