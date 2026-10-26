async def test_ingest_loads_all_sources(client):
    response = await client.post("/api/v1/ingest")
    assert response.status_code == 200
    assert response.json() == {"created": 100, "updated": 0, "by_source": {"ServiceNow": 50, "JIRA": 30, "Mailbox": 20}}

    # re-running is an upsert, not a duplicate load
    again = (await client.post("/api/v1/ingest")).json()
    assert again["created"] == 0 and again["updated"] == 100


async def test_list_tickets_filters(client):
    await client.post("/api/v1/ingest")

    data = (await client.get("/api/v1/tickets", params={"source": "Mailbox", "limit": 500})).json()
    assert data["total"] == 20
    assert all(t["source"] == "Mailbox" and t["reported_priority"] is None for t in data["items"])

    pending = (await client.get("/api/v1/tickets", params={"pipeline_status": "pending", "limit": 500})).json()
    historical = (await client.get("/api/v1/tickets", params={"pipeline_status": "historical", "limit": 500})).json()
    assert pending["total"] + historical["total"] == 100
    assert all(t["status"] in ("resolved", "closed") for t in historical["items"])


async def test_get_ticket_normalises_source_fields(client):
    await client.post("/api/v1/ingest")
    first_jira = (await client.get("/api/v1/tickets", params={"source": "JIRA", "limit": 1})).json()["items"][0]

    detail = (await client.get(f"/api/v1/tickets/{first_jira['id']}")).json()
    assert detail["raw"]["issue_key"] == first_jira["id"]
    assert detail["reported_priority_label"] in ("Highest", "High", "Medium", "Low", "Lowest")
    assert 1 <= detail["reported_priority"] <= 5
    assert detail["agent_runs"] == []


async def test_get_unknown_ticket_returns_404(client):
    response = await client.get("/api/v1/tickets/INC9999999")
    assert response.status_code == 404
