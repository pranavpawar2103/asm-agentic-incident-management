#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"

# 1. Check if virtual environment exists; create if not
if [ ! -d "$VENV_DIR" ]; then
    echo "⚙️ Virtual environment not found. Creating at '$VENV_DIR'..."
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created."
fi

# 2. Activate virtual environment
echo "🔌 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# 3. Ensure pip is updated and install dependencies
echo "📦 Installing / verifying dependencies from requirements-dev.txt..."
pip install --upgrade pip --quiet
pip install -r requirements-dev.txt --quiet
echo "✅ Dependencies are up to date."

# 4. Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
fi

# 5. Start the FastAPI server
echo "🚀 Starting FastAPI server on http://localhost:8000..."
echo "👉 Endpoints available:"
echo "   - Health:   http://localhost:8000/api/v1/health"
echo "   - Ingest:   POST http://localhost:8000/api/v1/ingest"
echo "   - Tickets:  http://localhost:8000/api/v1/tickets"
echo "   - Docs:     http://localhost:8000/api/v1/docs"
echo ""

exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
