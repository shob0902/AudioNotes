"""
Auth API.

POST /api/auth/signup  - create an account, returns a token (auto-login)
POST /api/auth/login   - verify credentials, returns a token
GET  /api/auth/me      - the logged-in user, used to restore a session

Also defines `get_current_user`, the dependency every protected route in
the app uses to identify the requester and enforce note ownership.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthService, hash_password, verify_password
from app.utils.exceptions import AuthError
from app.utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

# auto_error=False so a missing token gives a clean 401 (see get_current_user_id)
# instead of HTTPBearer's default 403.
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> uuid.UUID:
    """The requester's user id, straight from a verified JWT — no DB query.

    This is what every notes route actually needs (ownership checks only
    ever compare `note.user_id == <this>`), and against a remote DB the
    difference matters: adding a DB round trip here would tax on every
    single authenticated request just to re-confirm something the signed,
    server-issued token already guarantees. The trade-off is that a
    deleted account's token still authenticates until it expires (up to
    JWT_EXPIRES_MINUTES) rather than being revoked instantly — acceptable
    here since there's no admin/moderation deletion flow in scope, and
    `get_current_user` below (used by GET /auth/me) still does the real
    DB lookup for whoever actually needs a fresh, existence-checked user.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return AuthService().decode_access_token(credentials.credentials)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.user_message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    """The requester's full User row — an extra DB round trip beyond
    get_current_user_id, so only use this where the route actually needs
    more than the id (currently just GET /auth/me)."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is no longer valid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("auth.signup", extra={"user_id": str(user.id)})

    token = AuthService().create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    # Same message whether the email doesn't exist or the password is wrong
    # — don't help an attacker enumerate registered emails.
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")

    logger.info("auth.login", extra={"user_id": str(user.id)})
    token = AuthService().create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
