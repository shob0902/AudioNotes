"""
Object storage abstraction.

The rest of the application talks only to `StorageService` — never directly
to boto3/S3. That keeps the storage provider swappable (Cloudflare R2,
Supabase Storage, AWS S3, MinIO, ...) since they're all S3-compatible and
this is the only file that constructs a client.
"""

import io
import uuid
from datetime import timedelta

import boto3
from botocore.client import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from app.config import Settings, get_settings
from app.utils.exceptions import StorageError
from app.utils.logging import get_logger

logger = get_logger(__name__)

PRESIGNED_URL_EXPIRY_SECONDS = int(timedelta(hours=1).total_seconds())


class StorageService:
    """Thin, provider-agnostic wrapper around an S3-compatible bucket."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._client = boto3.client(
            "s3",
            endpoint_url=self.settings.storage_endpoint or None,
            aws_access_key_id=self.settings.storage_access_key or None,
            aws_secret_access_key=self.settings.storage_secret_key or None,
            region_name=self.settings.storage_region or None,
            config=BotoConfig(
                s3={"addressing_style": "path" if self.settings.storage_use_path_style else "auto"},
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )
        self.bucket = self.settings.storage_bucket

    def build_storage_key(self, note_id: uuid.UUID, original_filename: str) -> str:
        """Generates a safe, collision-resistant key. Never trusts the raw
        client filename as a path — only its extension is reused."""
        safe_ext = "".join(c for c in original_filename.rsplit(".", 1)[-1] if c.isalnum()).lower()
        safe_ext = safe_ext[:10] or "bin"
        return f"notes/{note_id}/original.{safe_ext}"

    def upload_file(self, storage_key: str, file_bytes: bytes, content_type: str) -> None:
        try:
            self._client.upload_fileobj(
                io.BytesIO(file_bytes),
                self.bucket,
                storage_key,
                ExtraArgs={"ContentType": content_type},
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("storage.upload_failed", extra={"storage_key": storage_key, "error": str(exc)})
            raise StorageError(
                "We couldn't save your audio file. Please try again.",
                technical_detail=f"S3 upload_fileobj failed for key={storage_key}: {exc}",
            ) from exc

    def download_file(self, storage_key: str) -> bytes:
        buffer = io.BytesIO()
        try:
            self._client.download_fileobj(self.bucket, storage_key, buffer)
        except (BotoCoreError, ClientError) as exc:
            logger.error("storage.download_failed", extra={"storage_key": storage_key, "error": str(exc)})
            raise StorageError(
                "We couldn't retrieve the stored audio file.",
                technical_detail=f"S3 download_fileobj failed for key={storage_key}: {exc}",
            ) from exc
        return buffer.getvalue()

    def delete_file(self, storage_key: str) -> None:
        try:
            self._client.delete_object(Bucket=self.bucket, Key=storage_key)
        except (BotoCoreError, ClientError) as exc:
            logger.error("storage.delete_failed", extra={"storage_key": storage_key, "error": str(exc)})
            raise StorageError(
                "We couldn't delete the stored audio file.",
                technical_detail=f"S3 delete_object failed for key={storage_key}: {exc}",
            ) from exc

    def get_file_url(self, storage_key: str) -> str:
        """Returns a public URL if STORAGE_PUBLIC_BASE_URL is configured,
        otherwise a short-lived pre-signed URL generated on demand."""
        if self.settings.storage_public_base_url:
            base = self.settings.storage_public_base_url.rstrip("/")
            return f"{base}/{storage_key}"

        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": storage_key},
                ExpiresIn=PRESIGNED_URL_EXPIRY_SECONDS,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("storage.presign_failed", extra={"storage_key": storage_key, "error": str(exc)})
            raise StorageError(
                "We couldn't generate a link to the stored audio file.",
                technical_detail=f"S3 generate_presigned_url failed for key={storage_key}: {exc}",
            ) from exc
