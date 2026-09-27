# JWT issuing/verification for the app's own session tokens, the only place jose signs tokens.
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.config import Settings, get_settings
from app.utils.exceptions import AuthError
class AuthService:
    # Grabs the settings and refuses to start if no JWT signing key is configured.
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        if not self.settings.jwt_secret_key:
            raise RuntimeError("JWT_SECRET_KEY is not configured on the server.")
    # Signs a token carrying the user id and an expiry taken from the settings.
    def create_access_token(self, user_id: uuid.UUID) -> str:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.settings.jwt_expires_minutes)
        payload = {"sub": str(user_id), "exp": expires_at}
        return jwt.encode(payload, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)
    # Verifies a token and returns the user id inside it, raising AuthError if it is no good.
    def decode_access_token(self, token: str) -> uuid.UUID:
        try:
            payload = jwt.decode(token, self.settings.jwt_secret_key, algorithms=[self.settings.jwt_algorithm])
            return uuid.UUID(payload["sub"])
        except (JWTError, KeyError, ValueError) as exc:
            raise AuthError(
                "Your session has expired. Please log in again.",
                technical_detail=f"JWT decode failed: {exc}",
            ) from exc
