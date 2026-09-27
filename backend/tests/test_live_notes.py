# Tests for live (browser-transcribed) notes: the /notes/live endpoint and the pipeline skipping Gnani.
import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock
from app.models.note import NoteStatus
from app.utils.exceptions import StorageError
from app.workers import tasks
from tests.conftest import make_wav_bytes
# Posts a live note with an optional recording attached.
def _create_live(client, headers, transcript="We agreed to ship on Friday.", title="Standup", audio=None):
    data = {"transcript": transcript, "title": title, "duration": "12.5"}
    files = {"file": ("live-recording.wav", audio, "audio/wav")} if audio is not None else None
    return client.post("/api/notes/live", data=data, files=files, headers=headers)
# Saving a live note without a token is rejected.
def test_live_note_requires_authentication(client):
    response = client.post("/api/notes/live", data={"transcript": "hello"})
    assert response.status_code == 401
# A transcript-only live note is queued, keeps the transcript and has no audio URL.
def test_live_note_without_audio(client, auth_headers):
    response = _create_live(client, auth_headers)
    assert response.status_code == 202
    assert response.json()["status"] == "queued"
    note_id = response.json()["id"]
    body = client.get(f"/api/notes/{note_id}", headers=auth_headers).json()
    assert body["title"] == "Standup"
    assert body["transcript"] == "We agreed to ship on Friday."
    assert body["duration"] == 12.5
    assert body["audio_url"] is None
# A live note with a recording stores the audio and reports its real duration.
def test_live_note_with_audio(client, auth_headers):
    response = _create_live(client, auth_headers, audio=make_wav_bytes(duration_seconds=3.0))
    assert response.status_code == 202
    body = client.get(f"/api/notes/{response.json()['id']}", headers=auth_headers).json()
    assert body["original_filename"] == "live-recording.wav"
    assert body["duration"] == 3.0
    assert body["audio_url"]
# If storage is down the note is still saved, just without audio.
def test_live_note_saved_when_storage_fails(client, auth_headers, monkeypatch):
    def fail(self, *a, **k):
        raise StorageError("We couldn't save your audio file. Please try again.")
    monkeypatch.setattr("app.services.storage_service.StorageService.upload_file", fail)
    response = _create_live(client, auth_headers, audio=make_wav_bytes(duration_seconds=3.0))
    assert response.status_code == 202
    body = client.get(f"/api/notes/{response.json()['id']}", headers=auth_headers).json()
    assert body["audio_url"] is None
    assert body["transcript"]
# A blank transcript is rejected.
def test_live_note_rejects_empty_transcript(client, auth_headers):
    response = _create_live(client, auth_headers, transcript="   ")
    assert response.status_code == 422
# A missing title falls back to a default.
def test_live_note_default_title(client, auth_headers):
    response = _create_live(client, auth_headers, title="")
    body = client.get(f"/api/notes/{response.json()['id']}", headers=auth_headers).json()
    assert body["title"] == "Live note"
# Another user can't see a live note.
def test_live_note_not_visible_to_other_user(client, auth_headers, make_auth_headers):
    note_id = _create_live(client, auth_headers).json()["id"]
    response = client.get(f"/api/notes/{note_id}", headers=make_auth_headers("other-live@example.com"))
    assert response.status_code == 404
# Deleting a note that has no stored audio works without touching storage.
def test_delete_live_note_without_audio(client, auth_headers):
    note_id = _create_live(client, auth_headers).json()["id"]
    assert client.delete(f"/api/notes/{note_id}", headers=auth_headers).status_code == 204
# The pipeline goes straight to summarizing when the note already has a transcript.
def test_pipeline_skips_transcription_when_transcript_present(monkeypatch):
    storage_cls = MagicMock()
    gnani_cls = MagicMock()
    groq_cls = MagicMock()
    groq_cls.return_value.summarize_transcript.return_value = {"summary": "ok"}
    monkeypatch.setattr(tasks, "StorageService", storage_cls)
    monkeypatch.setattr(tasks, "GnaniService", gnani_cls)
    monkeypatch.setattr(tasks, "GroqService", groq_cls)
    note = SimpleNamespace(id=uuid.uuid4(), storage_key="", transcript="hello world", summary=None, status=None)
    seen = []
    db = MagicMock()
    db.commit.side_effect = lambda: seen.append(note.status)
    tasks._run_pipeline(db, note)
    storage_cls.assert_not_called()
    gnani_cls.assert_not_called()
    groq_cls.return_value.summarize_transcript.assert_called_once_with("hello world", str(note.id))
    assert NoteStatus.TRANSCRIBING not in seen
    assert note.status == NoteStatus.COMPLETED
    assert note.summary == {"summary": "ok"}
# Notes without a transcript still go through storage download and Gnani.
def test_pipeline_transcribes_when_no_transcript(monkeypatch):
    storage_cls = MagicMock()
    storage_cls.return_value.download_file.return_value = b"audio"
    gnani_cls = MagicMock()
    gnani_cls.return_value.transcribe_audio.return_value = "transcribed"
    groq_cls = MagicMock()
    groq_cls.return_value.summarize_transcript.return_value = {"summary": "ok"}
    monkeypatch.setattr(tasks, "StorageService", storage_cls)
    monkeypatch.setattr(tasks, "GnaniService", gnani_cls)
    monkeypatch.setattr(tasks, "GroqService", groq_cls)
    note = SimpleNamespace(
        id=uuid.uuid4(), storage_key="notes/x/original.mp3", transcript=None, summary=None, status=None
    )
    tasks._run_pipeline(MagicMock(), note)
    gnani_cls.return_value.transcribe_audio.assert_called_once()
    assert note.transcript == "transcribed"
    assert note.status == NoteStatus.COMPLETED
