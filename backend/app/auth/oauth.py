from typing import Optional, Dict, Any, Union
import httpx
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError
import requests
from urllib.parse import urlencode

from app.models.user import User, UserRole
from app.core.config import settings
from app.utils.database import get_db
from app.auth.jwt import decode_access_token

logger = logging.getLogger(__name__)

# Определяем OAuth2 схему для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login"
)


class GoogleOAuth:
    """Класс для работы с Google OAuth API"""
    
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
    
    @classmethod
    def get_auth_url(cls, redirect_uri: str, state: str) -> str:
        """Генерирует URL для аутентификации через Google"""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{cls.GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    @classmethod
    def get_tokens(cls, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """Получает токены доступа от Google с использованием кода авторизации"""
        try:
            response = requests.post(
                cls.GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Ошибка при получении токенов Google: {e}")
            return None
    
    @classmethod
    def get_user_info(cls, access_token: str) -> Optional[Dict[str, Any]]:
        """Получает информацию о пользователе с использованием токена доступа"""
        try:
            response = requests.get(
                cls.GOOGLE_USER_INFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Ошибка при получении информации о пользователе Google: {e}")
            return None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Получает текущего пользователя из токена JWT
    
    Args:
        token: JWT токен
        db: Асинхронная сессия базы данных
        
    Returns:
        Объект пользователя
        
    Raises:
        HTTPException: Если токен невалидный или пользователь не найден
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Некорректные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Декодируем токен
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Ищем пользователя в базе данных
    query = select(User).where(User.id == int(user_id))
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Проверяет, что текущий пользователь активен
    
    Args:
        current_user: Текущий пользователь
        
    Returns:
        Объект пользователя, если он активен
        
    Raises:
        HTTPException: Если пользователь не активен
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учетная запись отключена"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """
    Проверяет, что текущий пользователь является администратором
    
    Args:
        current_user: Текущий пользователь
        
    Returns:
        Объект пользователя, если он администратор
        
    Raises:
        HTTPException: Если пользователь не администратор
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )
    return current_user 