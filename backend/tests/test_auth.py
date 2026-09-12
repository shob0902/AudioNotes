# Tests for the signup, login and /me authentication endpoints.
# Signing up returns 201 along with a usable bearer token.
def test_signup_creates_account_and_returns_token(client):
    response = client.post("/api/auth/signup", json={"email": "new@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
# Signing up twice with the same email is rejected with a conflict.
def test_signup_rejects_duplicate_email(client):
    payload = {"email": "dupe@example.com", "password": "correct-horse-battery"}
    first = client.post("/api/auth/signup", json=payload)
    assert first.status_code == 201
    second = client.post("/api/auth/signup", json=payload)
    assert second.status_code == 409
# A password under the minimum length fails validation.
def test_signup_rejects_too_short_password(client):
    response = client.post("/api/auth/signup", json={"email": "short@example.com", "password": "short"})
    assert response.status_code == 422
# Logging in with the right password returns a token.
def test_login_with_correct_credentials_succeeds(client):
    client.post("/api/auth/signup", json={"email": "login@example.com", "password": "correct-horse-battery"})
    response = client.post("/api/auth/login", json={"email": "login@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 200
    assert response.json()["access_token"]
# Logging in with the wrong password is rejected.
def test_login_with_wrong_password_fails(client):
    client.post("/api/auth/signup", json={"email": "wrongpw@example.com", "password": "correct-horse-battery"})
    response = client.post("/api/auth/login", json={"email": "wrongpw@example.com", "password": "not-the-password"})
    assert response.status_code == 401
# Logging in with an email that was never registered is rejected the same way.
def test_login_with_unknown_email_fails(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever12345"})
    assert response.status_code == 401
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
