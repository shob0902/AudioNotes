# Auth endpoints (Google sign-in, me) plus the dependencies that identify the caller.
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.config import Settings, get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import GoogleAuthUrlResponse, GoogleLoginRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthService
from app.services.google_oauth_service import GoogleIdentity, GoogleOAuthService
from app.utils.exceptions import AuthError, TransientServiceError
from app.utils.logging import get_logger
logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
_bearer_scheme = HTTPBearer(auto_error=False)
# Pulls the caller's user id out of the bearer token without touching the database.
def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> uuid.UUID:
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
# Loads the caller's full User row, for the few routes that need more than the id.
def get_current_user(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is no longer valid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
# Builds the Google service and 503s if the server hasn't been given Google credentials.
def _google_service(settings: Settings) -> GoogleOAuthService:
    service = GoogleOAuthService(settings)
    if not service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in isn't configured on the server.",
        )
    return service
# Finds the account for a Google identity (by Google id, then by email to link older accounts) or creates it.
def _upsert_google_user(db: Session, identity: GoogleIdentity) -> User:
    user = db.query(User).filter(User.google_sub == identity.sub).first()
    if user is None:
        user = db.query(User).filter(User.email == identity.email).first()
    if user is None:
        user = User(email=identity.email)
        db.add(user)
        logger.info("auth.google_signup", extra={"email_domain": identity.email.split("@")[-1]})
    user.google_sub = identity.sub
    user.email = identity.email
    user.name = identity.name
    user.avatar_url = identity.picture
    db.commit()
    db.refresh(user)
    return user
# Returns the Google consent URL; the browser generates `state` and checks it when Google redirects back.
@router.get("/google/url", response_model=GoogleAuthUrlResponse)
def google_auth_url(
    state: str = Query(..., min_length=16, max_length=256),
    settings: Settings = Depends(get_settings),
):
    return GoogleAuthUrlResponse(url=_google_service(settings).build_authorization_url(state))
# Swaps Google's one-time code for the user's identity, signs them in (creating the account on first visit)
# and returns the app's own access token.
@router.post("/google", response_model=TokenResponse)
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    service = _google_service(settings)
    try:
        identity = service.exchange_code(payload.code)
    except TransientServiceError as exc:
        logger.error("auth.google_unavailable", extra={"error": exc.technical_detail})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.user_message) from exc
    except AuthError as exc:
        logger.warning("auth.google_rejected", extra={"error": exc.technical_detail})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.user_message) from exc
    user = _upsert_google_user(db, identity)
    logger.info("auth.google_login", extra={"user_id": str(user.id)})
    return TokenResponse(access_token=AuthService(settings).create_access_token(user.id))
# Returns the logged-in user, which the frontend uses to restore a session on reload.
@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
