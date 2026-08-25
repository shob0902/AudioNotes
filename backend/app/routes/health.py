"""Liveness and readiness endpoints for load balancers / Render health checks."""

from fastapi import APIRouter, Depends
from redis import Redis
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Simple liveness check: is the process up at all."""
    return {"status": "ok"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness check: can we actually reach Postgres and Redis."""
    checks = {"database": "ok", "redis": "ok"}
    healthy = True

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "unreachable"
        healthy = False

    try:
        settings = get_settings()
        redis_client = Redis.from_url(settings.redis_url, socket_connect_timeout=2)
        redis_client.ping()
    except RedisError:
        checks["redis"] = "unreachable"
        healthy = False
    except Exception:
        checks["redis"] = "unreachable"
        healthy = False

    return {"status": "ok" if healthy else "degraded", "checks": checks}
