def test_signup_creates_account_and_returns_token(client):
    response = client.post("/api/auth/signup", json={"email": "new@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_signup_rejects_duplicate_email(client):
    payload = {"email": "dupe@example.com", "password": "correct-horse-battery"}
    first = client.post("/api/auth/signup", json=payload)
    assert first.status_code == 201

    second = client.post("/api/auth/signup", json=payload)
    assert second.status_code == 409


def test_signup_rejects_too_short_password(client):
    response = client.post("/api/auth/signup", json={"email": "short@example.com", "password": "short"})
    assert response.status_code == 422


def test_login_with_correct_credentials_succeeds(client):
    client.post("/api/auth/signup", json={"email": "login@example.com", "password": "correct-horse-battery"})

    response = client.post("/api/auth/login", json={"email": "login@example.com", "password": "correct-horse-battery"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_with_wrong_password_fails(client):
    client.post("/api/auth/signup", json={"email": "wrongpw@example.com", "password": "correct-horse-battery"})

    response = client.post("/api/auth/login", json={"email": "wrongpw@example.com", "password": "not-the-password"})
    assert response.status_code == 401


def test_login_with_unknown_email_fails(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever12345"})
    assert response.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"


def test_me_requires_authentication(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_rejects_garbage_token(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
