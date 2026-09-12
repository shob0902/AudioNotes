# Shared pytest fixtures: fake config, a real Postgres session, and a client with the externals stubbed out.
import io
import os
import wave
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
from app.models import note as _note
from app.models import user as _user
# Builds a tiny silent WAV in memory so no binary fixture files are needed in the repo.
def make_wav_bytes(duration_seconds: float = 1.0, framerate: int = 8000) -> bytes:
    n_frames = int(duration_seconds * framerate)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(framerate)
        wav_file.writeframes(b"\x00\x00" * n_frames)
    return buffer.getvalue()
# Creates the schema once for the whole test session and drops it again at the end.
@pytest.fixture(scope="session")
def engine():
    settings = get_settings()
    eng = create_engine(settings.database_url)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)
    eng.dispose()
# Hands each test its own session wrapped in a transaction that is rolled back afterwards.
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
# Builds a TestClient wired to the test session, with storage and background work stubbed out.
@pytest.fixture()
def client(db_session, monkeypatch):
    from app.main import app
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
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
# Signs a fresh user up through the real API and returns Authorization headers for them.
@pytest.fixture()
def auth_headers(client):
    response = client.post("/api/auth/signup", json={"email": "test@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
