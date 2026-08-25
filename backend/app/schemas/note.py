"""Pydantic response/request schemas for the notes API."""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.note import NoteStatus


class NoteSummary(BaseModel):
    """Structured summary produced by Groq. Matches the shape stored in
    Note.summary (JSONB)."""

    summary: str
    key_points: List[str] = []
    action_items: List[str] = []
    decisions: List[str] = []
    topics: List[str] = []


class NoteCreateResponse(BaseModel):
    """Returned immediately by POST /api/notes — no processing has happened
    yet, so this intentionally carries almost nothing."""

    id: uuid.UUID
    status: NoteStatus


class NoteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    original_filename: str
    duration: Optional[float]
    status: NoteStatus
    created_at: datetime


class NoteListResponse(BaseModel):
    items: List[NoteListItem]
    total: int


class NoteDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    original_filename: str
    file_size: int
    duration: Optional[float]
    mime_type: str
    status: NoteStatus
    transcript: Optional[str]
    summary: Optional[NoteSummary]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Not a Note column — a short-lived pre-signed (or public) URL generated
    # on demand by the route via StorageService.get_file_url(). Lets the
    # frontend play back the original audio alongside its transcript/summary.
    # None if the storage backend couldn't be reached; the rest of the note
    # still renders fine without it.
    audio_url: Optional[str] = None


class NoteStatusResponse(BaseModel):
    """Lightweight payload for the polling endpoint — deliberately small
    since the frontend calls this every 2-3 seconds while a note is active."""

    id: uuid.UUID
    status: NoteStatus
    error_message: Optional[str] = None
