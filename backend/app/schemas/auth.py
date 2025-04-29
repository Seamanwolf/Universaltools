from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[int] = None
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    role: UserRole

class GoogleLoginRequest(BaseModel):
    code: str
    redirect_uri: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class VerifyEmailRequest(BaseModel):
    token: str 