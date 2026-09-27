# Request and response shapes for the authentication endpoints.
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
# The consent-screen URL the browser should be sent to.
class GoogleAuthUrlResponse(BaseModel):
    url: str
# Body of the Google callback exchange: the one-time code Google appended to the redirect URL.
class GoogleLoginRequest(BaseModel):
    code: str = Field(min_length=1, max_length=2048)
# Access token handed back after a successful Google sign-in.
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
# Public view of a user account.
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
