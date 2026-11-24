# Personal API keys: create, list and revoke. Only reachable with a browser session, never with a key.
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.api_key import ApiKey
from app.routes.auth import get_session_user_id
from app.schemas.api_key import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyListResponse, ApiKeyResponse
from app.services.api_key_service import MAX_KEYS_PER_USER, create_api_key
from app.utils.logging import get_logger
logger = get_logger(__name__)
router = APIRouter(prefix="/api-keys", tags=["api-keys"])
# Creates a key and returns it in full; this response is the only place the plaintext ever appears.
@router.post("", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: ApiKeyCreateRequest,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_session_user_id),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Give the key a name.")
    existing = db.query(ApiKey).filter(ApiKey.user_id == current_user_id).count()
    if existing >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You can have at most {MAX_KEYS_PER_USER} API keys. Revoke one you no longer use first.",
        )
    api_key, plaintext = create_api_key(db, current_user_id, name)
    logger.info("api_key.created", extra={"user_id": str(current_user_id), "api_key_id": str(api_key.id)})
    return ApiKeyCreateResponse(**ApiKeyResponse.model_validate(api_key).model_dump(), key=plaintext)
# Lists the user's keys, newest first, without the secret part.
@router.get("", response_model=ApiKeyListResponse)
def list_keys(
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_session_user_id),
):
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.user_id == current_user_id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return ApiKeyListResponse(items=[ApiKeyResponse.model_validate(k) for k in keys])
# Revokes a key by deleting it; anything still using it gets a 401 from then on.
@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_key(
    key_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user_id: uuid.UUID = Depends(get_session_user_id),
):
    api_key = db.get(ApiKey, key_id)
    if api_key is None or api_key.user_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found.")
    db.delete(api_key)
    db.commit()
    logger.info("api_key.revoked", extra={"user_id": str(current_user_id), "api_key_id": str(key_id)})
