# Tests for Google sign-in (consent URL, code exchange, account linking) and the /me endpoint.
import time
import httpx
import pytest
import respx
from jose import jwt
from app.config import get_settings
from app.models.user import User
from app.services.google_oauth_service import GOOGLE_TOKEN_URL, GoogleOAuthService
from app.utils.exceptions import AuthError
CLIENT_ID = "test-client-id.apps.googleusercontent.com"
# Every test runs with Google credentials configured.
@pytest.fixture(autouse=True)
def google_settings(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "google_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "google_redirect_uri", "http://localhost:5173")
    return settings
# Builds an ID token like the one Google's token endpoint returns (signature isn't checked; see the service).
def make_id_token(**overrides):
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "google-123",
        "email": "Person@Example.com",
        "email_verified": True,
        "name": "Test Person",
        "picture": "https://example.com/avatar.png",
        "exp": int(time.time()) + 3600,
    }
    claims.update(overrides)
    return jwt.encode(claims, "irrelevant", algorithm="HS256")
# Stubs Google's token endpoint to return the given ID token (or status code).
def mock_token_endpoint(id_token=None, status_code=200):
    body = {"id_token": id_token, "access_token": "x"} if id_token else {"error": "invalid_grant"}
    return respx.post(GOOGLE_TOKEN_URL).mock(return_value=httpx.Response(status_code, json=body))
# The consent URL carries our client id, redirect URI, scopes and the browser's state.
def test_google_url_contains_client_state_and_scopes(client):
    response = client.get("/api/auth/google/url", params={"state": "s" * 32})
    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("https://accounts.google.com/o/oauth2/v2/auth?")
    assert f"client_id={CLIENT_ID}" in url
    assert "state=" + "s" * 32 in url
    assert "scope=openid+email+profile" in url
    assert "redirect_uri=http%3A%2F%2Flocalhost%3A5173" in url
# A too-short state is rejected, since it's the CSRF guard.
def test_google_url_requires_state(client):
    assert client.get("/api/auth/google/url", params={"state": "short"}).status_code == 422
# Without credentials the endpoints say Google sign-in isn't configured.
def test_google_not_configured_returns_503(client, google_settings, monkeypatch):
    monkeypatch.setattr(google_settings, "google_client_secret", "")
    assert client.get("/api/auth/google/url", params={"state": "s" * 32}).status_code == 503
    assert client.post("/api/auth/google", json={"code": "abc"}).status_code == 503
# First sign-in creates the account and returns a token that works on /me.
@respx.mock
def test_google_login_creates_account(client, db_session):
    route = mock_token_endpoint(make_id_token())
    response = client.post("/api/auth/google", json={"code": "one-time-code"})
    assert response.status_code == 200, response.text
    assert route.called
    sent = dict(httpx.QueryParams(route.calls.last.request.content.decode()))
    assert sent["code"] == "one-time-code"
    assert sent["grant_type"] == "authorization_code"
    token = response.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "person@example.com"
    assert me["name"] == "Test Person"
    assert me["avatar_url"] == "https://example.com/avatar.png"
# Signing in again reuses the same account instead of creating a duplicate.
@respx.mock
def test_google_login_is_idempotent(client, db_session):
    mock_token_endpoint(make_id_token())
    client.post("/api/auth/google", json={"code": "a"})
    client.post("/api/auth/google", json={"code": "b"})
    assert db_session.query(User).filter(User.email == "person@example.com").count() == 1
# An older account with the same email is linked to Google rather than duplicated.
@respx.mock
def test_google_login_links_existing_email_account(client, db_session):
    existing = User(email="person@example.com")
    db_session.add(existing)
    db_session.commit()
    mock_token_endpoint(make_id_token())
    token = client.post("/api/auth/google", json={"code": "c"}).json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["id"] == str(existing.id)
    db_session.refresh(existing)
    assert existing.google_sub == "google-123"
# A code Google rejects (expired or reused) comes back as 401.
@respx.mock
def test_google_login_rejected_code_returns_401(client):
    mock_token_endpoint(status_code=400)
    assert client.post("/api/auth/google", json={"code": "used"}).status_code == 401
# Google being unreachable is a 502, not a login failure.
@respx.mock
def test_google_login_network_error_returns_502(client):
    respx.post(GOOGLE_TOKEN_URL).mock(side_effect=httpx.ConnectError("boom"))
    assert client.post("/api/auth/google", json={"code": "x"}).status_code == 502
# ID tokens meant for another app, from another issuer, expired, or with an unverified email are refused.
@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "someone-else.apps.googleusercontent.com"},
        {"iss": "https://evil.example.com"},
        {"exp": int(time.time()) - 10},
        {"email_verified": False},
        {"email": ""},
    ],
)
def test_id_token_claim_checks(overrides):
    with pytest.raises(AuthError):
        GoogleOAuthService(get_settings())._identity_from_id_token(make_id_token(**overrides))
# /me echoes back the account that the token belongs to.
def test_me_returns_current_user(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"
# /me refuses a request that carries no token.
def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
# /me refuses a token that isn't a valid JWT.
def test_me_rejects_garbage_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
# The old password endpoints are gone.
def test_password_endpoints_removed(client):
    assert client.post("/api/auth/signup", json={"email": "a@b.co", "password": "12345678"}).status_code == 404
    assert client.post("/api/auth/login", json={"email": "a@b.co", "password": "12345678"}).status_code == 404
