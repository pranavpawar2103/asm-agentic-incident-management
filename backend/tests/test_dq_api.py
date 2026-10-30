"""Integration / API tests for Data Quality (DQ) rules and runs endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.db.session import get_db
from app.models.dq import DQRule, DQRun, DQRunTicket


@pytest.fixture
def mock_db():
    session = AsyncMock()
    return session


@pytest.fixture
async def dq_client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_create_dq_rule_success(dq_client, mock_db):
    mock_db.scalar.return_value = None  # No duplicate rule name
    
    payload = {
        "name": "Short Description Too Short",
        "description": "Flags tickets with tiny descriptions",
        "field": "short_description",
        "operator": "length_lt",
        "value": "10",
        "source": "ServiceNow",
        "apply_to": "both",
        "is_enabled": True
    }
    
    response = await dq_client.post("/api/v1/dq/rules", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["field"] == payload["field"]
    assert data["operator"] == payload["operator"]
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_create_dq_rule_invalid_field(dq_client):
    payload = {
        "name": "Invalid Field Rule",
        "field": "unknown_column_name",
        "operator": "equals",
        "value": "test"
    }
    response = await dq_client.post("/api/v1/dq/rules", json=payload)
    assert response.status_code == 400
    assert "Invalid field" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_dq_rule_duplicate_name(dq_client, mock_db):
    existing_rule = DQRule(id=1, name="Existing Rule", field="caller", operator="is_empty")
    mock_db.scalar.return_value = existing_rule

    payload = {
        "name": "Existing Rule",
        "field": "caller",
        "operator": "is_empty"
    }
    response = await dq_client.post("/api/v1/dq/rules", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_dq_rule_by_id(dq_client, mock_db):
    rule = DQRule(
        id=42,
        name="Check Caller",
        field="caller",
        operator="is_empty",
        apply_to="both",
        is_enabled=True
    )
    mock_db.get.return_value = rule

    response = await dq_client.get("/api/v1/dq/rules/42")
    assert response.status_code == 200
    assert response.json()["id"] == 42
    assert response.json()["name"] == "Check Caller"


@pytest.mark.asyncio
async def test_get_dq_rule_not_found(dq_client, mock_db):
    mock_db.get.return_value = None

    response = await dq_client.get("/api/v1/dq/rules/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_toggle_dq_rule(dq_client, mock_db):
    rule = DQRule(
        id=10,
        name="Toggle Test",
        field="caller",
        operator="is_empty",
        is_enabled=True,
        apply_to="both"
    )
    mock_db.get.return_value = rule

    response = await dq_client.patch("/api/v1/dq/rules/10/toggle")
    assert response.status_code == 200
    assert response.json()["is_enabled"] is False
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_soft_delete_dq_rule(dq_client, mock_db):
    rule = DQRule(
        id=15,
        name="Delete Me",
        field="caller",
        operator="is_empty",
        is_enabled=True,
        apply_to="both"
    )
    mock_db.get.return_value = rule

    response = await dq_client.delete("/api/v1/dq/rules/15")
    assert response.status_code == 204
    assert rule.deleted_at is not None
    assert rule.is_enabled is False
    assert mock_db.commit.called


@pytest.mark.asyncio
async def test_create_dq_run(dq_client, mock_db):
    fake_run = DQRun(
        id=1,
        scope="both",
        trigger="manual",
        tickets_evaluated=50,
        tickets_flagged=5,
        status="completed",
        rule_snapshot=[]
    )
    with patch("app.api.v1.endpoints.dq.execute_dq_run", return_value=fake_run):
        response = await dq_client.post("/api/v1/dq/runs", json={"scope": "both", "trigger": "manual"})
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["tickets_evaluated"] == 50
        assert data["tickets_flagged"] == 5


@pytest.mark.asyncio
async def test_revert_dq_run(dq_client, mock_db):
    fake_run = DQRun(
        id=1,
        scope="both",
        trigger="manual",
        tickets_evaluated=50,
        tickets_flagged=5,
        status="reverted",
        rule_snapshot=[]
    )
    with patch("app.api.v1.endpoints.dq.revert_dq_run", return_value=fake_run):
        response = await dq_client.post("/api/v1/dq/runs/1/revert")
        assert response.status_code == 200
        assert response.json()["status"] == "reverted"
