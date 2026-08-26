"""
Notes API.

POST /api/notes                 - upload audio, returns immediately (202)
GET  /api/notes                 - list the current user's notes, newest first
GET  /api/notes/{id}            - full note detail (transcript + summary)
GET  /api/notes/{id}/status     - lightweight status, for polling
POST /api/notes/{id}/retry      - re-queue a failed note
DELETE /api/notes/{id}          - delete a note and its stored audio

Every route requires a logged-in user (see get_current_user_id in
app/routes/auth.py) and only ever operates on that user's own notes —
another user's note id returns 404, not 403, so its existence isn't leaked.

The upload endpoint does ONLY fast, synchronous work: validate, store,
create the DB row, schedule the background task. It never waits on Gnani
or Groq — see app/workers/tasks.py for the actual processing pipeline.
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models.note import Note, NoteStatus
from app.routes.auth import get_current_user_id
from app.schemas.note import (
    NoteCreateResponse,
    NoteDetailResponse,
    NoteListItem,
    NoteListResponse,
    NoteStatusResponse,
)
from app.services.storage_service import StorageService
from app.utils.audio import sanitize_filename, validate_and_probe_audio
from app.utils.exceptions import StorageError, ValidationError
from app.utils.logging import get_logger
from app.workers.tasks import run_note_processing

logger = get_logger(__name__)
router = APIRouter(prefix="/notes", tags=["notes"])

# Statuses from which a retry is meaningful. A note that's already actively
# processing, or one that completed successfully, should not be re-queued.
_RETRYABLE_STATUSES = {NoteStatus.FAILED}


def _get_owned_note(db: Session, note_id: uuid.UUID, user_id: uuid.UUID) -> Note:
    """Fetches a note, 404-ing if it doesn't exist OR belongs to someone
    else — a different user's note should be indistinguishable from a note
    that doesn't exist at all."""
    note = db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note


@router.post("", response_model=NoteCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_note(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    original_filename = sanitize_filename(file.filename or "audio")

    file_bytes = await file.read()

    try:
        metadata = validate_and_probe_audio(
            file_bytes,
            original_filename,
            max_size_bytes=settings.max_upload_size_bytes,
            min_duration_seconds=settings.min_audio_duration_seconds,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.user_message) from exc

    if metadata.is_shorter_than_recommended:
        logger.info(
            "note.short_upload",
            # "filename" collides with a reserved LogRecord attribute
            # (logging.info(..., extra={"filename": ...}) raises KeyError:
            # "Attempt to overwrite 'filename' in LogRecord") — use a
            # namespaced key instead.
            extra={"original_filename": original_filename, "duration": metadata.duration_seconds},
        )
        # We deliberately do not reject short files (see app/utils/audio.py) —
        # the frontend surfaces MIN_AUDIO_DURATION_SECONDS as guidance, not a
        # hard requirement, since a hard rejection here would be a poor
        # experience for a file that's only slightly under the recommendation.

    note = Note(
        id=uuid.uuid4(),
        user_id=current_user_id,
        title=original_filename.rsplit(".", 1)[0][:255] or "Untitled note",
        original_filename=original_filename,
        storage_key="",  # set below, after we know the note's id
        file_size=len(file_bytes),
        duration=metadata.duration_seconds,
        mime_type=metadata.content_type,
        status=NoteStatus.UPLOADED,
    )

    storage = StorageService(settings)
    storage_key = storage.build_storage_key(note.id, original_filename)
    try:
        storage.upload_file(storage_key, file_bytes, metadata.content_type)
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.user_message) from exc

    note.storage_key = storage_key
    db.add(note)
    db.commit()
    db.refresh(note)

    note.status = NoteStatus.QUEUED
    db.commit()

    background_tasks.add_task(run_note_processing, str(note.id))
    logger.info("note.queued", extra={"note_id": str(note.id), "duration": metadata.duration_seconds})

    return NoteCreateResponse(id=note.id, status=note.status)


@router.get("", response_model=NoteListResponse)
def list_notes(
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    # A window-function count alongside the page of rows, instead of a
    # separate COUNT(*) query — halves the round trips this endpoint needs
    # against the DB, which matters when that DB is a remote/cloud one.
    # Known limitation: if `offset` skips past every matching row, this
    # returns 0 rows and therefore total=0 too (a window function's count
    # only covers rows actually returned). Not reachable today — the
    # frontend always requests offset=0 with no pagination UI — but worth
    # revisiting if real pagination is ever added.
    rows = (
        db.query(Note, func.count(Note.id).over().label("total_count"))
        .filter(Note.user_id == current_user_id)
        .order_by(Note.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    items = [row[0] for row in rows]
    total_count = rows[0][1] if rows else 0
    return NoteListResponse(
        items=[NoteListItem.model_validate(n) for n in items],
        total=total_count,
    )


@router.get("/{note_id}", response_model=NoteDetailResponse)
def get_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)

    detail = NoteDetailResponse.model_validate(note)
    try:
        detail.audio_url = StorageService(settings).get_file_url(note.storage_key)
    except StorageError as exc:
        # Playback is a nice-to-have on this page, not a reason to fail the
        # whole request — transcript/summary are still fully usable.
        logger.error("note.audio_url_failed", extra={"note_id": str(note.id), "error": exc.technical_detail})
    return detail


@router.get("/{note_id}/status", response_model=NoteStatusResponse)
def get_note_status(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)
    return NoteStatusResponse(id=note.id, status=note.status, error_message=note.error_message)


@router.post("/{note_id}/retry", response_model=NoteCreateResponse)
def retry_note(
    note_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)
    if note.status not in _RETRYABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed notes can be retried.",
        )

    note.status = NoteStatus.QUEUED
    note.error_message = None
    db.commit()

    background_tasks.add_task(run_note_processing, str(note.id))
    logger.info("note.retry_queued", extra={"note_id": str(note.id)})

    return NoteCreateResponse(id=note.id, status=note.status)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)

    storage = StorageService(settings)
    try:
        storage.delete_file(note.storage_key)
    except StorageError as exc:
        # Deleting the DB record still proceeds — an orphaned storage object
        # is a cleanup concern, not a reason to block the user's delete.
        logger.error("note.delete_storage_failed", extra={"note_id": str(note.id), "error": exc.technical_detail})

    db.delete(note)
    db.commit()
