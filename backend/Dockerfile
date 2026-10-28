# Multi-stage production Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final runner stage
FROM python:3.12-slim

WORKDIR /app

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=builder /install /usr/local
COPY app /app/app

# SQLite lives on a writable volume; source data (tickets, KB) is mounted read-only at /data
RUN mkdir -p /app/var && chown appuser:appuser /app/var
ENV DATABASE_URL=sqlite:////app/var/ams.db \
    TICKETS_FILE=/data/tickets/ams_tickets.xlsx     REGISTRY_DIR=/data/registry

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
