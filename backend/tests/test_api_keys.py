# Tests for personal API keys: creating, listing, revoking, and using one in place of a session token.
from app.models.api_key import ApiKey
from app.services.api_key_service import MAX_KEYS_PER_USER, hash_api_key
from tests.conftest import make_wav_bytes
# Creates a key through the API and returns the response body.
def create_key(client, headers, name="Claude Code"):
    response = client.post("/api/api-keys", json={"name": name}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()
# The full key comes back once, starts with an_, and only its hash is stored.
def test_create_returns_key_once_and_stores_only_hash(client, auth_headers, db_session):
    body = create_key(client, auth_headers)
    assert body["key"].startswith("an_")
    assert body["prefix"] == body["key"][:10]
    assert body["name"] == "Claude Code"
    row = db_session.get(ApiKey, body["id"])
    assert row.key_hash == hash_api_key(body["key"])
    assert body["key"] not in (row.key_hash, row.prefix)
    listed = client.get("/api/api-keys", headers=auth_headers).json()["items"]
    assert [k["id"] for k in listed] == [body["id"]]
    assert "key" not in listed[0]
# A blank name is rejected.
def test_create_rejects_blank_name(client, auth_headers):
    response = client.post("/api/api-keys", json={"name": "   "}, headers=auth_headers)
    assert response.status_code == 422
# An API key works anywhere a session token does, and records when it was used.
def test_api_key_authenticates_notes_and_me(client, auth_headers, db_session):
    body = create_key(client, auth_headers)
    key_headers = {"Authorization": f"Bearer {body['key']}"}
    assert client.get("/api/auth/me", headers=key_headers).json()["email"] == "test@example.com"
    assert client.get("/api/notes", headers=key_headers).status_code == 200
    db_session.expire_all()
    assert db_session.get(ApiKey, body["id"]).last_used_at is not None
# Uploading with an API key creates a note owned by the key's user.
def test_api_key_can_upload(client, auth_headers):
    key = create_key(client, auth_headers)["key"]
    response = client.post(
        "/api/notes",
        files={"file": ("clip.wav", make_wav_bytes(duration_seconds=125.0), "audio/wav")},
        headers={"Authorization": f"Bearer {key}"},
    )
    assert response.status_code == 202, response.text
    notes = client.get("/api/notes", headers=auth_headers).json()
    assert notes["total"] == 1
# An unknown key is a 401 with a clear message.
def test_unknown_key_is_rejected(client):
    response = client.get("/api/notes", headers={"Authorization": "Bearer an_not-a-real-key"})
    assert response.status_code == 401
    assert "invalid or has been revoked" in response.json()["detail"]
# After revoking, the key stops working immediately.
def test_revoked_key_stops_working(client, auth_headers):
    body = create_key(client, auth_headers)
    key_headers = {"Authorization": f"Bearer {body['key']}"}
    assert client.delete(f"/api/api-keys/{body['id']}", headers=auth_headers).status_code == 204
    assert client.get("/api/notes", headers=key_headers).status_code == 401
    assert client.get("/api/api-keys", headers=auth_headers).json()["items"] == []
# A key can't be used to create, list or revoke keys, so a leaked key can't mint more.
def test_api_key_cannot_manage_keys(client, auth_headers):
    body = create_key(client, auth_headers)
    key_headers = {"Authorization": f"Bearer {body['key']}"}
    assert client.get("/api/api-keys", headers=key_headers).status_code == 403
    assert client.post("/api/api-keys", json={"name": "x"}, headers=key_headers).status_code == 403
    assert client.delete(f"/api/api-keys/{body['id']}", headers=key_headers).status_code == 403
# Users only see and revoke their own keys; another user's key id is a 404.
def test_keys_are_scoped_to_their_owner(client, auth_headers, make_auth_headers):
    body = create_key(client, auth_headers)
    other_headers = make_auth_headers("other@example.com")
    assert client.get("/api/api-keys", headers=other_headers).json()["items"] == []
    assert client.delete(f"/api/api-keys/{body['id']}", headers=other_headers).status_code == 404
    assert client.get("/api/notes", headers={"Authorization": f"Bearer {body['key']}"}).status_code == 200
# Each user is capped at MAX_KEYS_PER_USER keys.
def test_key_limit(client, auth_headers):
    for i in range(MAX_KEYS_PER_USER):
        create_key(client, auth_headers, name=f"key {i}")
    response = client.post("/api/api-keys", json={"name": "one too many"}, headers=auth_headers)
    assert response.status_code == 409
# Key management needs a login at all.
def test_key_routes_require_auth(client):
    assert client.get("/api/api-keys").status_code == 401
