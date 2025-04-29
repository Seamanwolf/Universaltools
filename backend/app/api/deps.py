from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Union

from app.core.config import settings
from app.utils.database import get_db
from app.models.user import User, UserRole
from app.models.subscription import Subscription

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False
)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Получает текущего авторизованного пользователя
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Получаем пользователя из БД
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Получает текущего активного пользователя
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь неактивен"
        )
    
    return current_user

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Проверяет, что текущий пользователь имеет права администратора
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Операция требует прав администратора"
        )
    
    return current_user

async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Получает текущего пользователя, если он авторизован, иначе None
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        user_id: int = int(payload.get("sub"))
        if user_id is None:
            return None
        
        # Получаем пользователя из БД
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            return None
        
        return user
    except Exception:
        return None

async def check_subscription_active(db: AsyncSession, user_id: int) -> Subscription:
    """
    Проверяет наличие активной подписки у пользователя
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        
    Returns:
        Активная подписка
        
    Raises:
        HTTPException: Если у пользователя нет активной подписки
    """
    # Получаем активные подписки
    query = select(Subscription).where(
        Subscription.user_id == user_id,
        Subscription.is_active == 1
    )
    result = await db.execute(query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="У вас нет активной подписки"
        )
    
    # Проверяем ограничения подписки
    if subscription.downloads_limit is not None and subscription.downloads_used >= subscription.downloads_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Достигнут лимит скачиваний для вашей подписки"
        )
    
    return subscription 