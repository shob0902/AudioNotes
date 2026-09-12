# Request and response shapes for the notes API.
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.note import NoteStatus
# Structured summary from Groq, matching the JSONB shape stored on Note.summary.
class NoteSummary(BaseModel):
    summary: str
    key_points: List[str] = []
    action_items: List[str] = []
    decisions: List[str] = []
    topics: List[str] = []
# Minimal payload returned right after an upload, before any processing has run.
class NoteCreateResponse(BaseModel):
    id: uuid.UUID
    status: NoteStatus
# One row of the notes list, trimmed to what the dashboard cards actually show.
class NoteListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    original_filename: str
    duration: Optional[float]
    status: NoteStatus
    created_at: datetime
# A page of notes plus the total count.
class NoteListResponse(BaseModel):
    items: List[NoteListItem]
    total: int
# Full note payload, including the on-demand audio URL the detail page plays back.
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
    audio_url: Optional[str] = None
# Small payload for the polling endpoint the frontend hits every couple of seconds.
class NoteStatusResponse(BaseModel):
    id: uuid.UUID
    status: NoteStatus
    error_message: Optional[str] = None
