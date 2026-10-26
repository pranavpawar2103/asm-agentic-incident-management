async def test_hello_endpoint(client):
    response = await client.get("/api/v1/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "hello there"}
    assert "x-request-id" in response.headers
    assert "x-process-time-ms" in response.headers


async def test_health_endpoint(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
