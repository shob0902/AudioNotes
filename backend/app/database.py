"""
SQLAlchemy engine/session setup.

`get_db` is a FastAPI dependency that yields a request-scoped session.
`SessionLocal` is used directly by background tasks (see
app/workers/tasks.py), which run outside the request/response cycle and
therefore outside FastAPI's dependency system.
"""

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    # pool_pre_ping=True would add a "SELECT 1" round trip before *every*
    # pooled connection checkout to guard against a stale/dropped
    # connection — worth it on a fast local DB, but doubles latency on
    # every single request against a remote DB like Neon (each round trip
    # here runs several hundred ms). Every request already issues at least
    # one real query (get_current_user's lookup, if nothing else), so a
    # genuinely dead connection surfaces there instead — just as correct,
    # without taxing every healthy request. pool_recycle instead discards
    # connections older than this many seconds *before* they'd typically
    # go stale from a cloud provider's idle-connection timeout, which is
    # the actual failure mode pre_ping was guarding against here.
    pool_recycle=280,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Context manager for use in background tasks / scripts outside of FastAPI."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
