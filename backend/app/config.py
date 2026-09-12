# Central place for every app setting, all of it read from environment variables.
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )
    database_url: str = "postgresql+psycopg://audio_notes:audio_notes@localhost:5432/audio_notes"
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7
    gnani_api_key: str = ""
    gnani_api_url: str = "https://api.vachana.ai/stt/v3"
    gnani_language_code: str = "en-IN"
    gnani_transcript_format: str = "transcribe"
    gnani_chunk_seconds: int = 30
    gnani_timeout_seconds: int = 45
    gnani_max_retries: int = 3
    groq_api_key: str = ""
    groq_api_url: str = "https://api.groq.com/openai/v1/chat/completions"
    groq_model: str = "openai/gpt-oss-120b"
    groq_timeout_seconds: int = 60
    groq_max_retries: int = 3
    groq_max_input_chars: int = 12000
    storage_endpoint: str = ""
    storage_bucket: str = "audio-notes"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_region: str = "auto"
    storage_use_path_style: bool = True
    storage_public_base_url: str = ""
    max_upload_size_mb: int = 200
    min_audio_duration_seconds: int = 120
    ffmpeg_path: str = ""
    ffprobe_path: str = ""
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    # Splits the comma-separated FRONTEND_URL into the list of allowed CORS origins.
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.frontend_url.split(",") if origin.strip()]
    # Converts the configured upload limit from megabytes to bytes.
    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024
# Builds the Settings object once and caches it so every caller shares one instance.
@lru_cache
def get_settings() -> Settings:
    return Settings()
