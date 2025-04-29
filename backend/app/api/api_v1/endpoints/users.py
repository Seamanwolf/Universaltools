from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.utils.database import get_db
from app.models import User, Download, Subscription
from app.schemas.user import UserDetail, UserUpdate
from app.schemas.download import DownloadDetail
from app.schemas.subscription import SubscriptionDetail
from app.api.deps import get_current_user
from app.api.api_v1.endpoints.auth import get_password_hash

router = APIRouter()

@router.get("/me", response_model=UserDetail)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Получение информации о текущем пользователе
    """
    return current_user

@router.patch("/me", response_model=UserDetail)
async def update_current_user(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Обновление информации о текущем пользователе
    """
    # Обновляем только разрешенные поля
    update_data = user_update.dict(exclude_unset=True)
    
    # Если пароль изменяется, хешируем его
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    # Применяем обновления
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return current_user

@router.get("/me/downloads", response_model=List[DownloadDetail])
async def get_user_downloads(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка скачиваний текущего пользователя
    """
    query = select(Download).where(
        Download.user_id == current_user.id
    ).order_by(Download.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    downloads = result.scalars().all()
    
    return downloads

@router.get("/me/subscriptions", response_model=List[SubscriptionDetail])
async def get_user_subscriptions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка подписок текущего пользователя
    """
    query = select(Subscription).where(
        Subscription.user_id == current_user.id
    ).order_by(Subscription.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    return subscriptions

@router.get("/me/current-subscription", response_model=Optional[SubscriptionDetail])
async def get_current_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение текущей активной подписки пользователя
    """
    # Делегируем эндпоинту для подписок
    from app.api.api_v1.endpoints.subscriptions import get_current_subscription as get_sub
    
    return await get_sub(db=db, current_user=current_user) 