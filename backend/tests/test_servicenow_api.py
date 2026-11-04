"""Integration / API tests for ServiceNow tickets endpoints."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import get_db
from app.main import app
from app.models.servicenow import ServiceNowTicket


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
async def sn_client(mock_db):
    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_servicenow_tickets(sn_client, mock_db):
    now = datetime.now(timezone.utc)
    ticket1 = ServiceNowTicket(
        ticket_id="INC0001001",
        caller="John Doe",
        short_description="Password reset",
        priority="3 - Moderate",
        service="Active Directory",
        dq_flag=False,
        created_at=now,
    )
    ticket2 = ServiceNowTicket(
        ticket_id="INC0001002",
        caller=None,
        short_description="test",
        priority="4 - Low",
        service="Payment Gateway",
        dq_flag=True,
        dq_reason="Blank caller",
        created_at=now,
    )

    mock_db.scalar.return_value = 2
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [ticket1, ticket2]
    mock_db.scalars.return_value = mock_scalars

    response = await sn_client.get("/api/v1/servicenow/tickets", params={"dq_flag": True})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["ticket_id"] == "INC0001001"
    assert data["items"][1]["dq_flag"] is True
    assert data["items"][1]["dq_reason"] == "Blank caller"


@pytest.mark.asyncio
async def test_get_servicenow_ticket_detail(sn_client, mock_db):
    now = datetime.now(timezone.utc)
    ticket = ServiceNowTicket(
        ticket_id="INC0001001",
        caller="Alice Smith",
        short_description="Network connectivity issue",
        priority="2 - High",
        service="Network",
        dq_flag=False,
        created_at=now,
    )
    mock_db.get.return_value = ticket

    response = await sn_client.get("/api/v1/servicenow/tickets/INC0001001")
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"] == "INC0001001"
    assert data["caller"] == "Alice Smith"
    assert data["priority"] == "2 - High"


@pytest.mark.asyncio
async def test_get_servicenow_ticket_not_found(sn_client, mock_db):
    mock_db.get.return_value = None

    response = await sn_client.get("/api/v1/servicenow/tickets/UNKNOWN_TICKET")
    assert response.status_code == 404
