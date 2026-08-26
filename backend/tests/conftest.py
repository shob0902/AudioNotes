"""
Shared test fixtures.

Tests never touch real Gnani/Groq/storage credentials — external HTTP calls
are mocked with respx and StorageService/background-task dispatch are
monkeypatched.
Model tests do require a real PostgreSQL database (the same one from
docker-compose) because Note uses Postgres-specific types (UUID, JSONB,
native enum) that SQLite can't represent. Run `docker compose up -d
postgres` before `pytest` — see README.md "Testing".
"""

import io
import os
import wave

# Dummy, obviously-fake config so importing app.config never depends on a
# real .env file or real secrets being present in the test environment.
os.environ.setdefault("GNANI_API_KEY", "test-gnani-key")
os.environ.setdefault("GNANI_API_URL", "https://gnani.test/stt/v3")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GROQ_API_URL", "https://groq.test/openai/v1/chat/completions")
os.environ.setdefault("GROQ_MODEL", "openai/gpt-oss-120b")
os.environ.setdefault("STORAGE_ENDPOINT", "https://storage.test")
os.environ.setdefault("STORAGE_ACCESS_KEY", "test-access-key")
os.environ.setdefault("STORAGE_SECRET_KEY", "test-secret-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-not-for-production")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://audio_notes:audio_notes@localhost:5432/audio_notes_test",
)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.database import Base, get_db
from app.models import note as _note  # noqa: F401  (registers Note on Base.metadata before create_all)
from app.models import user as _user  # noqa: F401  (registers User on Base.metadata before create_all)


def make_wav_bytes(duration_seconds: float = 1.0, framerate: int = 8000) -> bytes:
    """Generates a tiny, valid, silent WAV file in memory — no ffmpeg-decoded
    fixture files need to be checked into the repo, and pydub/ffmpeg can
    still decode it like any real recording."""
    n_frames = int(duration_seconds * framerate)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(framerate)
        wav_file.writeframes(b"\x00\x00" * n_frames)
    return buffer.getvalue()


@pytest.fixture(scope="session")
def engine():
    settings = get_settings()
    eng = create_engine(settings.database_url)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()


@pytest.fixture()
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session_factory = sessionmaker(bind=connection)
    session = session_factory()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session, monkeypatch):
    # Import app.main lazily so the env vars above are set before Settings()
    # is first instantiated.
    from app.main import app

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Never actually run the background processing task or hit real object
    # storage during route tests — FastAPI's TestClient runs BackgroundTasks
    # to completion as part of the request, so without this every notes
    # route test would trigger the real Gnani/Groq/storage pipeline.
    monkeypatch.setattr("app.routes.notes.run_note_processing", lambda *a, **k: None)
    monkeypatch.setattr(
        "app.services.storage_service.StorageService.upload_file", lambda self, *a, **k: None
    )
    monkeypatch.setattr(
        "app.services.storage_service.StorageService.delete_file", lambda self, *a, **k: None
    )

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    """Signs up a fresh test user (via the real API, not a DB shortcut) and
    returns Authorization headers for it. Note routes require a logged-in
    user — see app/routes/notes.py — so most note tests depend on this."""
    response = client.post("/api/auth/signup", json={"email": "test@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
