from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_user
from app.schemas.subscription import SubscriptionCreate, SubscriptionResponse, SubscriptionUpdate, SubscriptionTypeEnum, SubscriptionStatusEnum, SubscriptionCancel
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionType, SubscriptionStatus
from app.services.payment import PaymentService
from app.services.subscription import SubscriptionService

router = APIRouter()
payment_service = PaymentService()

# Получение информации о ценах подписок
SUBSCRIPTION_PRICES = {
    SubscriptionType.BASIC: 199,       # 199 рублей в месяц
    SubscriptionType.PREMIUM: 499,     # 499 рублей в месяц
    SubscriptionType.UNLIMITED: 999,   # 999 рублей в месяц
}

# Получение информации о лимитах скачиваний для подписок
SUBSCRIPTION_LIMITS = {
    SubscriptionType.BASIC: 10,        # 10 скачиваний в месяц
    SubscriptionType.PREMIUM: 50,      # 50 скачиваний в месяц
    SubscriptionType.UNLIMITED: None,  # Безлимитное количество скачиваний
}

# Продолжительность подписки в днях
SUBSCRIPTION_DURATION = 30  # 30 дней


@router.post("/", response_model=SubscriptionResponse)
def create_subscription(
    subscription: SubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создание новой подписки
    """
    subscription_service = SubscriptionService(db)
    return subscription_service.create_subscription(current_user.id, subscription)


@router.get("/my", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение текущей активной подписки пользователя
    """
    subscription_service = SubscriptionService(db)
    subscription = subscription_service.get_active_subscription_by_user_id(current_user.id)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="У вас нет активной подписки"
        )
    
    return subscription


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение информации о подписке по ID
    """
    subscription_service = SubscriptionService(db)
    subscription = subscription_service.get_subscription_by_id(subscription_id)
    
    # Проверяем, принадлежит ли подписка текущему пользователю
    if subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    return subscription


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    subscription_update: SubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Обновление параметров подписки
    """
    subscription_service = SubscriptionService(db)
    subscription = subscription_service.get_subscription_by_id(subscription_id)
    
    # Проверяем, принадлежит ли подписка текущему пользователю
    if subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    return subscription_service.update_subscription(subscription_id, subscription_update)


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: int,
    cancellation: SubscriptionCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Отмена подписки
    """
    subscription_service = SubscriptionService(db)
    subscription = subscription_service.get_subscription_by_id(subscription_id)
    
    # Проверяем, принадлежит ли подписка текущему пользователю
    if subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен"
        )
    
    return subscription_service.cancel_subscription(subscription_id, cancellation.reason)


@router.get("/check/download-availability", response_model=bool)
def check_download_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Проверка возможности скачивания видео согласно текущей подписке
    """
    subscription_service = SubscriptionService(db)
    return subscription_service.can_download_video(current_user.id)


@router.get("/", response_model=List[SubscriptionResponse])
def get_all_subscriptions(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка всех подписок (только для администратора)
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только администратор может просматривать все подписки")
    
    subscriptions = db.query(Subscription).offset(skip).limit(limit).all()
    return subscriptions 