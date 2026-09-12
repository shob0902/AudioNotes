# Tests for the liveness and readiness endpoints.
# The liveness endpoint reports ok.
def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
# The readiness endpoint reports ok when the database is reachable.
def test_ready_ok(client):
    response = client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"database": "ok"}}
