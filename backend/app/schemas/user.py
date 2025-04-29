from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Базовая схема пользователя."""
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    """Схема для создания пользователя."""
    email: EmailStr
    password: Optional[str] = None
    username: Optional[str] = None


class UserLogin(BaseModel):
    """Схема для входа пользователя."""
    username: str
    password: str


class UserUpdate(UserBase):
    """Схема для обновления пользователя."""
    password: Optional[str] = None


class UserInDBBase(UserBase):
    """Базовая схема для пользователя в БД."""
    id: Optional[int] = None

    class Config:
        from_attributes = True


class User(UserInDBBase):
    """Схема пользователя для API-ответов."""
    pass


class UserOut(UserInDBBase):
    """Схема пользователя для API."""
    pass


class UserResponse(UserInDBBase):
    """Схема ответа с пользователем для API."""
    id: int
    email: EmailStr
    username: Optional[str] = None
    role: Optional[str] = None
    token: Optional[str] = None


class UserDetail(UserInDBBase):
    """Детальная схема пользователя для API."""
    username: Optional[str] = None
    role: Optional[str] = None


class UserInDB(UserInDBBase):
    """Схема пользователя для внутреннего использования."""
    hashed_password: str


class Token(BaseModel):
    """Схема токена авторизации"""
    access_token: str
    token_type: str = "bearer"
    user_id: Optional[int] = None
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None


class TokenPayload(BaseModel):
    """Полезная нагрузка JWT токена"""
    sub: Optional[int] = None
    exp: Optional[int] = None 