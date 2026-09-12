# S3-compatible object storage wrapper; the only file in the app that touches boto3.
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
    # Builds the S3 client from the configured endpoint, keys and addressing style.
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
    # Makes a safe storage key from the note id, reusing only the extension of the upload.
    def build_storage_key(self, note_id: uuid.UUID, original_filename: str) -> str:
        safe_ext = "".join(c for c in original_filename.rsplit(".", 1)[-1] if c.isalnum()).lower()
        safe_ext = safe_ext[:10] or "bin"
        return f"notes/{note_id}/original.{safe_ext}"
    # Uploads the audio bytes to the bucket under the given key.
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
    # Pulls a stored file back into memory as raw bytes.
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
    # Removes a stored file from the bucket.
    def delete_file(self, storage_key: str) -> None:
        try:
            self._client.delete_object(Bucket=self.bucket, Key=storage_key)
        except (BotoCoreError, ClientError) as exc:
            logger.error("storage.delete_failed", extra={"storage_key": storage_key, "error": str(exc)})
            raise StorageError(
                "We couldn't delete the stored audio file.",
                technical_detail=f"S3 delete_object failed for key={storage_key}: {exc}",
            ) from exc
    # Gives back a public URL when one is configured, otherwise a short-lived signed URL.
    def get_file_url(self, storage_key: str) -> str:
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
