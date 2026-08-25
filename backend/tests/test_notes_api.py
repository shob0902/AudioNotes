import uuid
from datetime import datetime, timedelta, timezone

from app.models.note import Note
from tests.conftest import make_wav_bytes


def _upload(client, headers, duration_seconds=125.0, filename="meeting.wav"):
    files = {"file": (filename, make_wav_bytes(duration_seconds=duration_seconds), "audio/wav")}
    return client.post("/api/notes", files=files, headers=headers)


def test_upload_requires_authentication(client):
    files = {"file": ("meeting.wav", make_wav_bytes(duration_seconds=125.0), "audio/wav")}
    response = client.post("/api/notes", files=files)
    assert response.status_code == 401


def test_upload_valid_audio_returns_queued(client, auth_headers):
    response = _upload(client, auth_headers)
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert "id" in body


def test_upload_shorter_than_recommended_still_succeeds(client, auth_headers):
    # Exercises the "note.short_upload" logging path specifically — a
    # previous bug used extra={"filename": ...} in that log call, which
    # collides with a reserved LogRecord attribute and raised KeyError,
    # crashing this exact request. No other test uploads a file this short
    # through the real route (test_audio_validation.py only exercises the
    # validation function directly, not the logging that follows it).
    response = _upload(client, auth_headers, duration_seconds=5.0)
    assert response.status_code == 202
    assert response.json()["status"] == "queued"


def test_upload_rejects_unsupported_format(client, auth_headers):
    files = {"file": ("notes.txt", b"hello world", "text/plain")}
    response = client.post("/api/notes", files=files, headers=auth_headers)
    assert response.status_code == 422
    assert "Unsupported" in response.json()["detail"]


def test_upload_rejects_empty_file(client, auth_headers):
    files = {"file": ("empty.mp3", b"", "audio/mpeg")}
    response = client.post("/api/notes", files=files, headers=auth_headers)
    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()


def test_get_note_after_upload(client, auth_headers):
    note_id = _upload(client, auth_headers).json()["id"]

    response = client.get(f"/api/notes/{note_id}", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["original_filename"] == "meeting.wav"
    assert body["status"] == "queued"
    assert body["transcript"] is None
    assert body["summary"] is None
    # A playable pre-signed/public URL is generated on demand for the audio
    # player, even before processing finishes (audio is uploaded up front).
    assert body["audio_url"]


def test_get_note_status(client, auth_headers):
    note_id = _upload(client, auth_headers).json()["id"]

    response = client.get(f"/api/notes/{note_id}/status", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"id": note_id, "status": "queued", "error_message": None}


def test_get_note_not_found(client, auth_headers):
    response = client.get("/api/notes/00000000-0000-0000-0000-000000000000", headers=auth_headers)
    assert response.status_code == 404


def test_note_is_not_visible_to_a_different_user(client, auth_headers):
    note_id = _upload(client, auth_headers).json()["id"]

    other_user_headers = {
        "Authorization": "Bearer "
        + client.post("/api/auth/signup", json={"email": "someone-else@example.com", "password": "another-password"}).json()[
            "access_token"
        ]
    }

    # A note belonging to someone else should look exactly like a note that
    # doesn't exist — 404, not 403, so its existence isn't leaked.
    response = client.get(f"/api/notes/{note_id}", headers=other_user_headers)
    assert response.status_code == 404

    response = client.get("/api/notes", headers=other_user_headers)
    assert response.json()["items"] == []


def test_list_notes_newest_first(client, auth_headers, db_session):
    first_id = _upload(client, auth_headers, filename="first.wav").json()["id"]
    second_id = _upload(client, auth_headers, filename="second.wav").json()["id"]

    # Postgres's now()/func.now() is stable for the whole test transaction
    # (not per-statement), so both notes created above would otherwise share
    # an identical created_at here — this never happens in real usage
    # (separate requests are separate transactions) but would make this
    # test's ordering assertion nondeterministic. Stagger them explicitly so
    # the real "ORDER BY created_at DESC" behavior is actually exercised.
    now = datetime.now(timezone.utc)
    db_session.query(Note).filter(Note.id == uuid.UUID(first_id)).update({"created_at": now - timedelta(seconds=10)})
    db_session.query(Note).filter(Note.id == uuid.UUID(second_id)).update({"created_at": now})
    db_session.commit()

    response = client.get("/api/notes", headers=auth_headers)
    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids.index(second_id) < ids.index(first_id)


def test_retry_only_allowed_when_failed(client, auth_headers, db_session):
    note_id = _upload(client, auth_headers).json()["id"]

    # Still "queued", not "failed" -> retry should be rejected.
    response = client.post(f"/api/notes/{note_id}/retry", headers=auth_headers)
    assert response.status_code == 409

    from app.models.note import Note, NoteStatus

    note = db_session.get(Note, uuid.UUID(note_id))
    note.status = NoteStatus.FAILED
    note.error_message = "Transcription timed out. Please try again."
    db_session.commit()

    response = client.post(f"/api/notes/{note_id}/retry", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "queued"


def test_delete_note(client, auth_headers):
    note_id = _upload(client, auth_headers).json()["id"]

    response = client.delete(f"/api/notes/{note_id}", headers=auth_headers)
    assert response.status_code == 204

    response = client.get(f"/api/notes/{note_id}", headers=auth_headers)
    assert response.status_code == 404
