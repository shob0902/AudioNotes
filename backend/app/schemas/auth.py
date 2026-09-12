# Request and response shapes for the authentication endpoints.
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
# Body of a signup request, with the minimum password length enforced here.
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
# Body of a login request.
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
# Access token handed back after a successful signup or login.
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
# Public view of a user account.
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    created_at: datetime
