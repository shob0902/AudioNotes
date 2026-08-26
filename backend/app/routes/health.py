"""Liveness and readiness endpoints for load balancers / Render health checks."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Simple liveness check: is the process up at all."""
    return {"status": "ok"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    """Readiness check: can we actually reach Postgres."""
    checks = {"database": "ok"}
    healthy = True

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "unreachable"
        healthy = False

    return {"status": "ok" if healthy else "degraded", "checks": checks}
