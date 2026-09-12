# SQLAlchemy engine and session plumbing used by both the API and the background tasks.
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import get_settings
settings = get_settings()
engine = create_engine(
    settings.database_url,
    pool_recycle=280,
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
class Base(DeclarativeBase):
    pass
# FastAPI dependency that hands out a DB session and always closes it afterwards.
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# Session context manager for code outside FastAPI; commits on success, rolls back on error.
@contextmanager
def session_scope() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
