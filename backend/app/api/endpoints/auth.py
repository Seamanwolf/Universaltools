from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
import uuid
from urllib.parse import urljoin

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import Token, GoogleLoginRequest
from app.auth.jwt import create_access_token, verify_password, get_password_hash
from app.auth.oauth import GoogleOAuth
from app.services.user import UserService

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Аутентификация пользователя через логин и пароль"""
    user_service = UserService(db)
    user = await user_service.get_user_by_email(form_data.username)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=Token)
async def register_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Регистрация нового пользователя"""
    user_service = UserService(db)
    existing_user = await user_service.get_user_by_email(form_data.username)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    
    hashed_password = get_password_hash(form_data.password)
    user = User(
        email=form_data.username,
        hashed_password=hashed_password,
    )
    
    await user_service.create_user(user)
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/google/login")
async def google_login(request: Request):
    """Инициирует процесс входа через Google OAuth"""
    # Создаем состояние для CSRF защиты
    state = secrets.token_urlsafe(16)
    request.session["oauth_state"] = state
    
    # Генерируем URL для редиректа на страницу аутентификации Google
    redirect_uri = urljoin(str(request.base_url), "/api/auth/google/callback")
    auth_url = GoogleOAuth.get_auth_url(redirect_uri, state)
    
    return {"auth_url": auth_url}

@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Обработка callback от Google OAuth"""
    # Проверяем state для защиты от CSRF
    session_state = request.session.get("oauth_state")
    if not session_state or session_state != state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительное состояние OAuth",
        )
    
    # Получаем токены от Google
    redirect_uri = urljoin(str(request.base_url), "/api/auth/google/callback")
    tokens = GoogleOAuth.get_tokens(code, redirect_uri)
    
    if not tokens or "access_token" not in tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось получить токены от Google",
        )
    
    # Получаем информацию о пользователе
    user_info = GoogleOAuth.get_user_info(tokens["access_token"])
    
    if not user_info or "email" not in user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось получить информацию о пользователе от Google",
        )
    
    # Ищем пользователя или создаем нового
    user_service = UserService(db)
    user = await user_service.get_user_by_email(user_info["email"])
    
    if not user:
        # Создаем нового пользователя
        user = User(
            email=user_info["email"],
            name=user_info.get("name", ""),
            google_id=user_info.get("sub", ""),
            hashed_password="",  # У пользователей Google нет пароля
        )
        await user_service.create_user(user)
    
    # Создаем JWT токен
    access_token = create_access_token(data={"sub": user.email})
    
    # Очищаем состояние OAuth
    if "oauth_state" in request.session:
        del request.session["oauth_state"]
    
    # Возвращаем токен в ответе
    return {"access_token": access_token, "token_type": "bearer"} 