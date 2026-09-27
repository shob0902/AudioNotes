# Google OAuth 2.0 / OpenID Connect sign-in: builds the consent URL and swaps the returned code for a verified identity.
import time
from dataclasses import dataclass
from urllib.parse import urlencode
import httpx
from jose import JWTError, jwt
from app.config import Settings, get_settings
from app.utils.exceptions import AuthError, TransientServiceError
from app.utils.logging import get_logger
logger = get_logger(__name__)
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
TOKEN_TIMEOUT_SECONDS = 15
# The parts of a Google account the app stores.
@dataclass
class GoogleIdentity:
    sub: str
    email: str
    name: str | None
    picture: str | None
class GoogleOAuthService:
    # Grabs the settings; is_configured tells the routes whether Google sign-in can be offered at all.
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
    @property
    def is_configured(self) -> bool:
        s = self.settings
        return bool(s.google_client_id and s.google_client_secret and s.google_redirect_uri)
    # Builds the Google consent-screen URL; `state` is the browser's CSRF token and comes back untouched.
    def build_authorization_url(self, state: str) -> str:
        params = {
            "client_id": self.settings.google_client_id,
            "redirect_uri": self.settings.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
            "access_type": "online",
            "include_granted_scopes": "true",
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    # Exchanges the one-time code at Google's token endpoint and returns the verified account behind it.
    def exchange_code(self, code: str) -> GoogleIdentity:
        try:
            response = httpx.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self.settings.google_client_id,
                    "client_secret": self.settings.google_client_secret,
                    "redirect_uri": self.settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Accept": "application/json"},
                timeout=TOKEN_TIMEOUT_SECONDS,
            )
        except httpx.HTTPError as exc:
            raise TransientServiceError(
                "Couldn't reach Google. Please try again.",
                technical_detail=f"Google token request failed: {exc}",
            ) from exc
        if response.status_code >= 500:
            raise TransientServiceError(
                "Google sign-in is temporarily unavailable. Please try again.",
                technical_detail=f"Google token endpoint returned {response.status_code}",
            )
        if response.status_code != 200:
            raise AuthError(
                "Google sign-in expired or was already used. Please try again.",
                technical_detail=f"Google token endpoint returned {response.status_code}: {response.text[:300]}",
            )
        id_token = response.json().get("id_token")
        if not id_token:
            raise AuthError("Google didn't return an identity. Please try again.", technical_detail="No id_token in response")
        return self._identity_from_id_token(id_token)
    # Validates the ID token's claims. It came straight from Google's token endpoint over TLS, which OpenID
    # Connect Core §3.1.3.7 accepts in place of a signature check, so we verify audience, issuer, expiry and email.
    def _identity_from_id_token(self, id_token: str) -> GoogleIdentity:
        try:
            claims = jwt.get_unverified_claims(id_token)
        except JWTError as exc:
            raise AuthError("Google returned an unreadable identity.", technical_detail=str(exc)) from exc
        audience = claims.get("aud")
        audiences = audience if isinstance(audience, list) else [audience]
        if self.settings.google_client_id not in audiences:
            raise AuthError("Google sign-in failed. Please try again.", technical_detail=f"Unexpected aud: {audience}")
        if claims.get("iss") not in GOOGLE_ISSUERS:
            raise AuthError("Google sign-in failed. Please try again.", technical_detail=f"Unexpected iss: {claims.get('iss')}")
        if int(claims.get("exp", 0)) < time.time():
            raise AuthError("Google sign-in expired. Please try again.", technical_detail="id_token expired")
        email = (claims.get("email") or "").strip().lower()
        if not claims.get("sub") or not email:
            raise AuthError("Your Google account didn't share an email address.", technical_detail="Missing sub/email")
        if claims.get("email_verified") not in (True, "true"):
            raise AuthError("Your Google email address isn't verified yet.", technical_detail="email_verified is false")
        return GoogleIdentity(sub=str(claims["sub"]), email=email, name=claims.get("name"), picture=claims.get("picture"))
