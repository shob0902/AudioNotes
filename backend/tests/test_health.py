def test_health_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_reports_redis_unreachable(client, monkeypatch):
    class ExplodingRedis:
        @staticmethod
        def from_url(*_args, **_kwargs):
            raise ConnectionError("no redis in this test")

    monkeypatch.setattr("app.routes.health.Redis", ExplodingRedis)

    response = client.get("/api/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["redis"] == "unreachable"
    assert body["checks"]["database"] == "ok"
