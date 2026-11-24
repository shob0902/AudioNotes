# Request and response shapes for personal API keys.
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
# Body for creating a key: just a label so the user can tell their keys apart.
class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
# A key as listed in settings: never the key itself, only its first few characters.
class ApiKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
# Returned once, right after creation: the only time the full key is ever sent.
class ApiKeyCreateResponse(ApiKeyResponse):
    key: str
# All of the user's keys, newest first.
class ApiKeyListResponse(BaseModel):
    items: List[ApiKeyResponse]
