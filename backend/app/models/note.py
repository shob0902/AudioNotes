"""
The `notes` table: one row per uploaded audio file, tracking it end-to-end
from upload through transcription and summarization.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NoteStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"
    FAILED = "failed"


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Owning user — every note belongs to exactly one account. Deleting a
    # user cascades to their notes (ondelete="CASCADE") rather than leaving
    # orphaned rows behind.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)

    # Object storage reference. storage_key is the canonical reference used by
    # StorageService; storage_url is a cached pre-signed/public URL that may
    # be regenerated on demand and should not be treated as permanent.
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    storage_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # bytes
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)  # seconds
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)

    status: Mapped[NoteStatus] = mapped_column(
        # values_callable is required here: SQLAlchemy's Enum type defaults
        # to using the Python enum member's *name* (e.g. "UPLOADED") as the
        # database value, not its .value ("uploaded") — but the Postgres
        # enum type (see the initial Alembic migration) was created with
        # the lowercase .value strings. Without this, every insert/update
        # fails with "invalid input value for enum note_status".
        Enum(NoteStatus, name="note_status", native_enum=True, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=NoteStatus.UPLOADED,
        index=True,
    )

    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Structured summary persisted as JSONB:
    # { summary, key_points[], action_items[], decisions[], topics[] }
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<Note id={self.id} status={self.status}>"
