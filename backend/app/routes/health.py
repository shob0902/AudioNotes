# Liveness and readiness endpoints used by load balancers and the Render health check.
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
router = APIRouter(tags=["health"])
# Liveness check that only confirms the process is up.
@router.get("/health")
def health():
    return {"status": "ok"}
# Readiness check that confirms Postgres is actually reachable.
@router.get("/ready")
def ready(db: Session = Depends(get_db)):
    checks = {"database": "ok"}
    healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "unreachable"
        healthy = False
    return {"status": "ok" if healthy else "degraded", "checks": checks}
