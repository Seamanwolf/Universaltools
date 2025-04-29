from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, BackgroundTasks, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import logging
import secrets
import httpx
import json

from app.models.user import User, UserRole
from app.utils.database import get_db
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin, UserDetail
from app.auth.jwt import create_access_token, verify_token, verify_password, get_password_hash, get_current_user
from app.auth.oauth import GoogleOAuth
from app.services.user import UserService
from app.services.email import email_service
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest

router = APIRouter()
logger = logging.getLogger(__name__)

# Redis для хранения токенов OAuth (в реальном приложении использовать Redis)
redis_oauth_tokens = {}


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Регистрация нового пользователя с email и паролем
    """
    # Проверяем, что пользователь с таким email не существует
    query = select(User).where(User.email == user_data.email)
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Создаем нового пользователя
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(user_data.password)
    
    # Генерируем токен для верификации email
    verification_token = secrets.token_urlsafe(32)
    
    user = User(
        email=user_data.email,
        username=user_data.username or user_data.email.split("@")[0],
        hashed_password=hashed_password,
        is_active=True,
        is_google_auth=False,
        role=UserRole.USER,
        is_email_verified=False,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow()
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Отправляем email с верификацией (без ожидания ответа)
    await email_service.send_verification_email(user.email, verification_token)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Аутентификация пользователя и получение токена доступа
    """
    # Находим пользователя по email
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Проверяем существование пользователя и правильность пароля
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Генерируем токен
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        username=user.username,
        role=user.role
    )


@router.get("/google/login")
async def google_login():
    """Начало процесса аутентификации через Google"""
    # Генерируем случайный state для защиты от CSRF
    state = secrets.token_urlsafe(32)
    
    # В реальном приложении сохранить состояние в Redis с TTL
    redis_oauth_tokens[state] = {"created_at": datetime.utcnow().isoformat()}
    
    # Формируем URL для редиректа на страницу авторизации Google
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/auth"
        f"?response_type=code"
        f"&client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&scope=openid%20email%20profile"
        f"&state={state}"
    )
    
    return {"url": google_auth_url}


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Обработка ответа от Google OAuth"""
    if error:
        return {"error": error, "redirect_url": f"{settings.FRONTEND_URL}/login?error={error}"}
    
    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отсутствуют необходимые параметры"
        )
    
    # Проверяем состояние (в реальном приложении проверять в Redis)
    if state not in redis_oauth_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительное состояние"
        )
    
    # Удаляем использованное состояние
    del redis_oauth_tokens[state]
    
    try:
        # Используем класс GoogleOAuth для получения токенов
        google_oauth = GoogleOAuth()
        token_info = await google_oauth.exchange_code(code)
        
        # Получаем информацию о пользователе
        user_info = await google_oauth.get_user_info(token_info['access_token'])
            
        # Проверяем, существует ли пользователь
        query = select(User).where(User.email == user_info["email"])
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            # Создаем нового пользователя
            username = user_info.get("name", "").replace(" ", "") or user_info["email"].split("@")[0]
            
            # Проверяем, что имя пользователя уникально
            query = select(User).where(User.username == username)
            result = await db.execute(query)
            existing_username = result.scalar_one_or_none()
            
            if existing_username:
                # Если имя пользователя уже существует, добавляем случайный суффикс
                username = f"{username}_{secrets.token_hex(4)}"
            
            user = User(
                email=user_info["email"],
                username=username,
                is_active=True,
                is_google_auth=True,
                role=UserRole.USER
            )
            
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        # Генерируем токен
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=access_token_expires
        )
        
        # Возвращаем URL для редиректа с токеном
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}&user_id={user.id}"
        
        return {"redirect_url": redirect_url}
            
    except Exception as e:
        logger.exception(f"Google OAuth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка авторизации через Google: {str(e)}"
        )


@router.get("/me", response_model=UserDetail)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Получение информации о текущем авторизованном пользователе"""
    return current_user


@router.post("/logout")
async def logout():
    """
    Выход пользователя
    В текущей реализации JWT нет серверного хранения токенов,
    поэтому клиент сам должен удалить токен
    """
    return {"message": "Выход выполнен успешно"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token: str = Depends(lambda x: x.headers.get("Authorization", "").replace("Bearer ", "")),
    db: AsyncSession = Depends(get_db)
):
    """
    Обновление токена доступа
    """
    # Проверяем существующий токен
    payload = verify_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный токен авторизации"
        )
    
    # Получаем пользователя из БД
    user_id = payload["sub"]
    query = select(User).where(User.id == int(user_id))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Генерируем новый токен
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        username=user.username,
        role=user.role
    )


@router.post("/verify-email", response_model=Dict[str, str])
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Верификация email по токену
    """
    query = select(User).where(User.email_verification_token == data.token)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный токен верификации"
        )
    
    # Проверяем, не истек ли срок действия токена
    if user.email_verification_sent_at:
        expiration_time = user.email_verification_sent_at + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        if datetime.utcnow() > expiration_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия токена истек. Запросите новый токен."
            )
    
    # Устанавливаем флаг подтвержденного email
    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_sent_at = None
    
    db.add(user)
    await db.commit()
    
    return {"message": "Email успешно подтвержден"}


@router.post("/resend-verification", response_model=Dict[str, str])
async def resend_verification_email(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Повторная отправка письма для верификации email
    """
    if current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже подтвержден"
        )
    
    # Генерируем новый токен верификации
    token = secrets.token_urlsafe(32)
    current_user.email_verification_token = token
    current_user.email_verification_sent_at = datetime.utcnow()
    
    db.add(current_user)
    await db.commit()
    
    # Отправляем письмо
    await email_service.send_verification_email(current_user.email, token)
    
    return {"message": "Письмо с инструкциями по верификации отправлено"}


@router.post("/forgot-password", response_model=Dict[str, str])
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Запрос на сброс пароля (Отправляет письмо с токеном для сброса)
    """
    query = select(User).where(User.email == data.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Если пользователь не найден, все равно возвращаем успешный ответ
    # (чтобы не раскрывать информацию о существовании пользователя)
    if not user:
        return {"message": "Если указанный email зарегистрирован в системе, на него отправлено письмо с инструкциями."}
    
    # Генерируем токен для сброса пароля
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_at = datetime.utcnow()
    
    db.add(user)
    await db.commit()
    
    # Отправляем письмо
    await email_service.send_password_reset_email(user.email, token)
    
    return {"message": "Если указанный email зарегистрирован в системе, на него отправлено письмо с инструкциями."}


@router.post("/reset-password", response_model=Dict[str, str])
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Сброс пароля по токену
    """
    query = select(User).where(User.password_reset_token == data.token)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный токен сброса пароля"
        )
    
    # Проверяем, не истек ли срок действия токена
    if user.password_reset_at:
        expiration_time = user.password_reset_at + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
        if datetime.utcnow() > expiration_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия токена истек. Запросите сброс пароля повторно."
            )
    
    # Устанавливаем новый пароль
    user.hashed_password = get_password_hash(data.new_password)
    user.password_reset_token = None
    user.password_reset_at = None
    
    db.add(user)
    await db.commit()
    
    return {"message": "Пароль успешно изменен. Теперь вы можете войти с новым паролем."} 