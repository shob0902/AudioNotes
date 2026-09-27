# Notes API: upload, list, fetch, poll status, retry and delete, all scoped to the logged-in user.
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile, status
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
_RETRYABLE_STATUSES = {NoteStatus.FAILED}
MAX_LIVE_TRANSCRIPT_CHARS = 200_000
# Fetches a note and 404s unless it exists and belongs to this user, so ids are never leaked.
def _get_owned_note(db: Session, note_id: uuid.UUID, user_id: uuid.UUID) -> Note:
    note = db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found.")
    return note
# Validates the upload, stores the audio, saves the row and hands processing to a background task.
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
            extra={"original_filename": original_filename, "duration": metadata.duration_seconds},
        )
    note = Note(
        id=uuid.uuid4(),
        user_id=current_user_id,
        title=original_filename.rsplit(".", 1)[0][:255] or "Untitled note",
        original_filename=original_filename,
        storage_key="",
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
# Saves a note transcribed live in the browser: the transcript arrives ready-made, so only the summary runs.
# The recording is optional and best-effort; if storage fails the note is still saved without audio.
@router.post("/live", response_model=NoteCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_live_note(
    background_tasks: BackgroundTasks,
    transcript: str = Form(...),
    title: str | None = Form(None),
    duration: float | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    transcript = transcript.strip()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The transcript is empty.")
    if len(transcript) > MAX_LIVE_TRANSCRIPT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"The transcript is too long. Maximum is {MAX_LIVE_TRANSCRIPT_CHARS:,} characters.",
        )
    clean_title = (title or "").strip()[:255] or "Live note"
    note = Note(
        id=uuid.uuid4(),
        user_id=current_user_id,
        title=clean_title,
        original_filename="live-transcription",
        storage_key="",
        file_size=0,
        duration=duration if duration and duration > 0 else None,
        mime_type="text/plain",
        transcript=transcript,
        status=NoteStatus.UPLOADED,
    )
    file_bytes = await file.read() if file is not None else b""
    if file_bytes:
        original_filename = sanitize_filename(file.filename or "live-recording.webm")
        try:
            metadata = validate_and_probe_audio(
                file_bytes,
                original_filename,
                max_size_bytes=settings.max_upload_size_bytes,
                min_duration_seconds=settings.min_audio_duration_seconds,
            )
            storage = StorageService(settings)
            storage_key = storage.build_storage_key(note.id, original_filename)
            storage.upload_file(storage_key, file_bytes, metadata.content_type)
            note.original_filename = original_filename
            note.storage_key = storage_key
            note.file_size = len(file_bytes)
            note.duration = metadata.duration_seconds
            note.mime_type = metadata.content_type
        except (ValidationError, StorageError) as exc:
            logger.warning(
                "note.live_audio_skipped",
                extra={"note_id": str(note.id), "reason": exc.technical_detail},
            )
    db.add(note)
    db.commit()
    db.refresh(note)
    note.status = NoteStatus.QUEUED
    db.commit()
    background_tasks.add_task(run_note_processing, str(note.id))
    logger.info("note.live_queued", extra={"note_id": str(note.id), "has_audio": bool(note.storage_key)})
    return NoteCreateResponse(id=note.id, status=note.status)
# Returns a page of the user's notes, newest first, with the total count in the same query.
@router.get("", response_model=NoteListResponse)
def list_notes(
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
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
# Returns one note in full, attaching a playback URL when storage can be reached.
@router.get("/{note_id}", response_model=NoteDetailResponse)
def get_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)
    detail = NoteDetailResponse.model_validate(note)
    if not note.storage_key:
        return detail
    try:
        detail.audio_url = StorageService(settings).get_file_url(note.storage_key)
    except StorageError as exc:
        logger.error("note.audio_url_failed", extra={"note_id": str(note.id), "error": exc.technical_detail})
    return detail
# Cheap status lookup that the frontend polls while a note is still processing.
@router.get("/{note_id}/status", response_model=NoteStatusResponse)
def get_note_status(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)
    return NoteStatusResponse(id=note.id, status=note.status, error_message=note.error_message)
# Puts a failed note back in the queue and kicks off processing again.
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
# Deletes the note row and best-effort removes its stored audio file.
@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
):
    note = _get_owned_note(db, note_id, current_user_id)
    if note.storage_key:
        try:
            StorageService(settings).delete_file(note.storage_key)
        except StorageError as exc:
            logger.error("note.delete_storage_failed", extra={"note_id": str(note.id), "error": exc.technical_detail})
    db.delete(note)
    db.commit()
