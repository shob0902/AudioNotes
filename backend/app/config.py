"""
Centralized application configuration.

All configuration is read from environment variables (see .env.example at the
repo root). Nothing here should ever contain a hardcoded secret, API key, or
environment-specific URL — those all come from the environment so the same
image can run locally, in CI, and on Render without code changes.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolved relative to this file (backend/app/config.py -> repo root), not
# the process's current working directory. This matters because the app is
# normally started with `cd backend && uvicorn ...`, while the single .env
# file lives at the repo root alongside docker-compose.yml — a CWD-relative
# "./.env" would silently miss it and fall back to defaults. When no .env
# file exists here (e.g. inside a Docker/Render container, where real env
# vars are injected directly), pydantic-settings just skips it — harmless.
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---------------------------------------------------------
    database_url: str = "postgresql+psycopg://audio_notes:audio_notes@localhost:5432/audio_notes"

    # --- Auth (JWT) -----------------------------------------------------------
    # No default on purpose, same pattern as gnani_api_key/groq_api_key — a
    # real secret must be provided. Generate one with e.g. `openssl rand -hex 32`.
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days

    # --- Redis / Celery -----------------------------------------------------
    # Port 6380, not Redis's default 6379 - see docker-compose.yml's redis
    # service for why (avoids colliding with other local projects' Redis).
    redis_url: str = "redis://localhost:6380/0"

    # --- Gnani Speech-to-Text ----------------------------------------------
    gnani_api_key: str = ""
    gnani_api_url: str = "https://api.vachana.ai/stt/v3"
    gnani_language_code: str = "en-IN"
    gnani_transcript_format: str = "transcribe"  # "verbatim" | "transcribe"
    gnani_chunk_seconds: int = 30
    gnani_timeout_seconds: int = 45
    gnani_max_retries: int = 3

    # --- Groq LLM -------------------------------------------------------------
    groq_api_key: str = ""
    groq_api_url: str = "https://api.groq.com/openai/v1/chat/completions"
    groq_model: str = "openai/gpt-oss-120b"
    groq_timeout_seconds: int = 60
    groq_max_retries: int = 3
    groq_max_input_chars: int = 12000

    # --- Object storage -------------------------------------------------------
    storage_endpoint: str = ""
    storage_bucket: str = "audio-notes"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_region: str = "auto"
    storage_use_path_style: bool = True
    storage_public_base_url: str = ""

    # --- Upload validation ---------------------------------------------------
    max_upload_size_mb: int = 200
    min_audio_duration_seconds: int = 120

    # --- Audio decoding (ffmpeg) ---------------------------------------------
    # Optional absolute paths to the ffmpeg/ffprobe binaries. Left blank, pydub
    # falls back to whatever `ffmpeg`/`ffprobe` resolve to on PATH — which is
    # fine in Docker/Render (the image installs a single known-good ffmpeg),
    # but fragile on a dev machine that may have an old/unrelated ffmpeg
    # earlier on PATH (a stale PATH entry from some other tool, or a PATH
    # update that hasn't propagated to an already-running terminal/IDE). Set
    # these to pin exactly which binaries this app uses, independent of PATH.
    ffmpeg_path: str = ""
    ffprobe_path: str = ""

    # --- URLs / CORS ----------------------------------------------------------
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        # Support a comma-separated list in FRONTEND_URL for multi-origin setups
        # (e.g. a Render preview URL plus a custom domain).
        return [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
