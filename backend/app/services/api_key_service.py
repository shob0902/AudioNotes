# Creates and checks personal API keys. Keys are long random strings, so a plain SHA-256 hash is
# enough to store them safely (no slow password hash needed) and lets lookups use an index.
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.api_key import ApiKey
from app.utils.exceptions import AuthError
API_KEY_PREFIX = "an_"
DISPLAY_PREFIX_LENGTH = 10
MAX_KEYS_PER_USER = 20
LAST_USED_WRITE_INTERVAL = timedelta(minutes=5)
# True when a bearer token looks like an API key rather than a session JWT.
def is_api_key(token: str) -> bool:
    return token.startswith(API_KEY_PREFIX)
# Hex SHA-256 of the key, which is what the database stores and indexes.
def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
# Makes a new key for the user and returns the row plus the plaintext key, which is never stored.
def create_api_key(db: Session, user_id: uuid.UUID, name: str) -> tuple[ApiKey, str]:
    plaintext = f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"
    api_key = ApiKey(
        user_id=user_id,
        name=name,
        prefix=plaintext[:DISPLAY_PREFIX_LENGTH],
        key_hash=hash_api_key(plaintext),
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key, plaintext
# Looks a key up by its hash and returns the owner's id, raising AuthError if it is unknown or revoked.
# last_used_at is only written every few minutes so busy clients don't turn every read into a write.
def authenticate_api_key(db: Session, key: str) -> uuid.UUID:
    api_key = db.query(ApiKey).filter(ApiKey.key_hash == hash_api_key(key)).first()
    if api_key is None:
        raise AuthError(
            "This API key is invalid or has been revoked.",
            technical_detail="API key not found",
        )
    now = datetime.now(timezone.utc)
    if api_key.last_used_at is None or now - api_key.last_used_at > LAST_USED_WRITE_INTERVAL:
        api_key.last_used_at = now
        db.commit()
    return api_key.user_id
