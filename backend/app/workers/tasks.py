"""
The background processing pipeline:

    processing -> transcribing -> summarizing -> completed
                                                -> failed (on any unrecoverable error)

Each stage transition is committed to Postgres immediately so the frontend's
status-polling endpoint always reflects real progress, never a stale value.
Every external-service call goes through GnaniService / GroqService, which
already retry transient failures internally — anything that reaches this
task as an exception is either a permanent failure or retries exhausted, so
the note is always moved to a terminal state. A note is never left stuck in
a non-terminal status.

`run_note_processing` runs as a FastAPI `BackgroundTasks` callback, in the
same process as the API — scheduled from app/routes/notes.py after the
upload response is sent, not via a separate queue/worker.
"""

import uuid

from app.database import SessionLocal
from app.models.note import Note, NoteStatus
from app.services.gnani_service import GnaniService
from app.services.groq_service import GroqService
from app.services.storage_service import StorageService
from app.utils.exceptions import AppError
from app.utils.logging import get_logger

logger = get_logger(__name__)


def _set_status(db, note: Note, status: NoteStatus) -> None:
    note.status = status
    db.commit()
    logger.info("note.status_change", extra={"note_id": str(note.id), "status": status.value})


def run_note_processing(note_id: str) -> None:
    db = SessionLocal()
    try:
        note = db.get(Note, uuid.UUID(note_id))
        if note is None:
            logger.error("worker.note_not_found", extra={"note_id": note_id})
            return
        _run_pipeline(db, note)
    finally:
        db.close()


def _run_pipeline(db, note: Note) -> None:
    note_id = str(note.id)
    try:
        _set_status(db, note, NoteStatus.PROCESSING)
        storage = StorageService()
        audio_bytes = storage.download_file(note.storage_key)

        _set_status(db, note, NoteStatus.TRANSCRIBING)
        extension = note.storage_key.rsplit(".", 1)[-1] if "." in note.storage_key else None
        transcript = GnaniService().transcribe_audio(audio_bytes, note_id, extension=extension)
        note.transcript = transcript
        db.commit()
        logger.info("note.transcribed", extra={"note_id": note_id, "transcript_length": len(transcript)})

        _set_status(db, note, NoteStatus.SUMMARIZING)
        summary = GroqService().summarize_transcript(transcript, note_id)
        note.summary = summary
        db.commit()
        logger.info("note.summarized", extra={"note_id": note_id})

        _set_status(db, note, NoteStatus.COMPLETED)
        logger.info("note.completed", extra={"note_id": note_id})

    except AppError as exc:
        db.rollback()
        _mark_failed(db, note, exc.user_message)
        logger.error(
            "note.failed",
            extra={"note_id": note_id, "reason": exc.technical_detail, "retryable": exc.retryable},
        )
    except Exception:
        db.rollback()
        _mark_failed(db, note, "An unexpected error occurred while processing this note.")
        logger.exception("note.unexpected_failure", extra={"note_id": note_id})


def _mark_failed(db, note: Note, message: str) -> None:
    # Re-fetch in case the rollback detached the object from the session.
    fresh = db.get(Note, note.id)
    fresh.status = NoteStatus.FAILED
    fresh.error_message = message
    db.commit()
