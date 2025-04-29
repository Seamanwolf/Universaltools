from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc, func
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging

from app.utils.database import get_db
from app.models import User, Subscription, SubscriptionType, Payment, PaymentStatus, PaymentMethod
from app.schemas.subscription import (
    SubscriptionCreate, SubscriptionResponse, SubscriptionDetail, 
    SubscriptionPlan, SubscriptionUpdate, SubscriptionPlanList
)
from app.api.deps import get_current_user, get_admin_user, get_current_active_user
from app.core.config import settings
from app.services.payment import get_payment_processor
from app.services.payment import PaymentService

router = APIRouter()
logger = logging.getLogger(__name__)

# Определение планов подписки
SUBSCRIPTION_PLANS = {
    SubscriptionType.TRIAL: {
        "name": "Пробная подписка",
        "description": "3 скачивания в любом качестве",
        "price": 0.0,
        "downloads_limit": 3,
        "duration_days": None,
        "features": ["3 скачивания", "Все форматы", "Высокое качество", "Без конвертации"]
    },
    SubscriptionType.ONE_TIME: {
        "name": "Разовое скачивание",
        "description": "Одно скачивание в любом качестве",
        "price": 99.0,
        "downloads_limit": 1,
        "duration_days": None,
        "features": ["1 скачивание", "Все форматы", "Высокое качество", "Конвертация в другие форматы"]
    },
    SubscriptionType.PACK_10: {
        "name": "Пакет 10 скачиваний",
        "description": "10 скачиваний в любом качестве",
        "price": 799.0,
        "downloads_limit": 10,
        "duration_days": None,
        "features": ["10 скачиваний", "Все форматы", "Высокое качество", "Конвертация в другие форматы", "Скидка 20%"]
    },
    SubscriptionType.MONTHLY: {
        "name": "Месячная подписка",
        "description": "Безлимитное количество скачиваний на месяц",
        "price": 1999.0,
        "downloads_limit": None,
        "duration_days": 30,
        "features": ["Безлимитные скачивания", "Все форматы", "Высокое качество", "Конвертация в другие форматы", "Приоритетная поддержка"]
    },
    SubscriptionType.YEARLY: {
        "name": "Годовая подписка",
        "description": "Безлимитное количество скачиваний на год",
        "price": 15990.0,
        "downloads_limit": None,
        "duration_days": 365,
        "features": ["Безлимитные скачивания", "Все форматы", "Высокое качество", "Конвертация в другие форматы", "Приоритетная поддержка", "Скидка 33%"]
    }
}

@router.get("/plans", response_model=SubscriptionPlanList)
async def get_subscription_plans(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Получение списка доступных планов подписки
    с информацией о доступности пробной подписки
    """
    payment_service = PaymentService()
    
    # Формируем список планов
    plans = [
        SubscriptionPlan(
            type=SubscriptionType.ONE_TIME,
            name="Разовое скачивание",
            description="Возможность скачать 1 видео в любом качестве",
            price=payment_service.get_subscription_price(SubscriptionType.ONE_TIME),
            downloads_limit=1,
            duration_days=None,
            features=[
                "Любое доступное качество",
                "Конвертация в любой формат",
                "Сохранение истории"
            ]
        ),
        SubscriptionPlan(
            type=SubscriptionType.PACK_10,
            name="Пакет 10 скачиваний",
            description="Возможность скачать 10 видео в любом качестве",
            price=payment_service.get_subscription_price(SubscriptionType.PACK_10),
            downloads_limit=10,
            duration_days=None,
            features=[
                "Любое доступное качество",
                "Конвертация в любой формат",
                "Сохранение истории",
                "Скидка 20%"
            ]
        ),
        SubscriptionPlan(
            type=SubscriptionType.MONTHLY,
            name="Месячная подписка",
            description="Безлимитное скачивание в течение месяца",
            price=payment_service.get_subscription_price(SubscriptionType.MONTHLY),
            downloads_limit=None,
            duration_days=30,
            features=[
                "Безлимитное количество скачиваний",
                "Любое доступное качество",
                "Конвертация в любой формат",
                "Сохранение истории"
            ]
        ),
        SubscriptionPlan(
            type=SubscriptionType.YEARLY,
            name="Годовая подписка",
            description="Безлимитное скачивание в течение года",
            price=payment_service.get_subscription_price(SubscriptionType.YEARLY),
            downloads_limit=None,
            duration_days=365,
            features=[
                "Безлимитное количество скачиваний",
                "Любое доступное качество",
                "Конвертация в любой формат",
                "Сохранение истории",
                "Максимальная скидка"
            ]
        )
    ]
    
    # Проверяем использовал ли пользователь пробную подписку
    has_trial = False
    trial_used = True  # По умолчанию считаем, что пользователь уже использовал пробную подписку
    
    if current_user:
        query = select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.type == SubscriptionType.TRIAL
        )
        result = await db.execute(query)
        existing_trial = result.scalar_one_or_none()
        
        # Если пробной подписки нет, то она доступна
        trial_used = existing_trial is not None
        has_trial = True  # Для авторизованных пользователей пробная подписка доступна
    
    return SubscriptionPlanList(
        plans=plans,
        has_trial=has_trial,
        trial_used=trial_used
    )

@router.post("/", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_create: SubscriptionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создание новой подписки и инициация платежа
    """
    # Проверяем, что запрошенный тип подписки существует
    if subscription_create.type not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип подписки: {subscription_create.type}"
        )
    
    # Получаем информацию о плане подписки
    plan = SUBSCRIPTION_PLANS[subscription_create.type]
    
    # Если это пробная подписка, проверяем, не использовал ли пользователь её ранее
    if subscription_create.type == SubscriptionType.TRIAL:
        query = select(Subscription).where(
            and_(
                Subscription.user_id == current_user.id,
                Subscription.type == SubscriptionType.TRIAL
            )
        )
        result = await db.execute(query)
        existing_trial = result.scalar_one_or_none()
        
        if existing_trial:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Вы уже использовали пробную подписку"
            )
    
    # Создаем подписку
    now = datetime.utcnow()
    end_date = now + timedelta(days=plan["duration_days"]) if plan["duration_days"] else None
    
    subscription = Subscription(
        user_id=current_user.id,
        type=subscription_create.type,
        start_date=now,
        end_date=end_date,
        downloads_limit=plan["downloads_limit"],
        downloads_used=0,
        price=plan["price"],
        is_active=0  # Изначально неактивна, станет активной после оплаты
    )
    
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    
    # Если это бесплатная пробная подписка, активируем её сразу
    if subscription_create.type == SubscriptionType.TRIAL:
        subscription.is_active = 1
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)
        
        return subscription
    
    # Для платных подписок создаем платеж
    payment = Payment(
        user_id=current_user.id,
        subscription_id=subscription.id,
        amount=plan["price"],
        payment_method=PaymentMethod(subscription_create.payment_method),
        status=PaymentStatus.PENDING
    )
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    # Обрабатываем платеж в зависимости от метода оплаты
    payment_processor = get_payment_processor(subscription_create.payment_method)
    
    # Запускаем обработку платежа в фоне
    background_tasks.add_task(
        payment_processor.process_payment,
        payment_id=payment.id,
        amount=payment.amount,
        description=f"Подписка {plan['name']}",
        user_id=current_user.id,
        subscription_id=subscription.id
    )
    
    # Возвращаем созданную подписку
    return subscription

@router.post("/trial", response_model=SubscriptionResponse)
async def create_trial_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Активирует пробную подписку для текущего пользователя,
    если он её ещё не использовал
    """
    # Проверяем, использовал ли пользователь пробную подписку ранее
    query = select(Subscription).where(
        Subscription.user_id == current_user.id,
        Subscription.type == SubscriptionType.TRIAL
    )
    result = await db.execute(query)
    existing_trial = result.scalar_one_or_none()
    
    if existing_trial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Вы уже использовали пробную подписку"
        )
    
    # Получаем данные для пробной подписки
    payment_service = PaymentService()
    trial_limit = settings.TRIAL_DOWNLOADS_LIMIT
    
    # Создаем пробную подписку
    subscription = Subscription(
        user_id=current_user.id,
        type=SubscriptionType.TRIAL,
        start_date=datetime.utcnow(),
        end_date=None,  # Без ограничения по времени
        downloads_limit=trial_limit,
        downloads_used=0,
        price=0.0,  # Бесплатно
        is_active=1,
        payment_id=None
    )
    
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    
    return subscription

@router.get("/", response_model=List[SubscriptionDetail])
async def list_subscriptions(
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
    ).order_by(desc(Subscription.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    return subscriptions

@router.get("/current", response_model=Optional[SubscriptionDetail])
async def get_current_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение текущей активной подписки пользователя
    """
    # Ищем активные подписки с учетом лимитов и сроков
    now = datetime.utcnow()
    
    # Сначала проверяем безлимитные подписки
    query = select(Subscription).where(
        and_(
            Subscription.user_id == current_user.id,
            Subscription.is_active == 1,
            Subscription.downloads_limit == None,  # Безлимитная по количеству
            (Subscription.end_date == None) | (Subscription.end_date > now)  # Не истекшая
        )
    ).order_by(desc(Subscription.end_date))
    
    result = await db.execute(query)
    unlimited_sub = result.scalar_one_or_none()
    
    if unlimited_sub:
        return unlimited_sub
    
    # Затем проверяем лимитированные подписки
    query = select(Subscription).where(
        and_(
            Subscription.user_id == current_user.id,
            Subscription.is_active == 1,
            Subscription.downloads_limit > Subscription.downloads_used,  # Есть доступные скачивания
            (Subscription.end_date == None) | (Subscription.end_date > now)  # Не истекшая
        )
    ).order_by(desc(Subscription.created_at))
    
    result = await db.execute(query)
    limited_sub = result.scalar_one_or_none()
    
    return limited_sub

@router.get("/{subscription_id}", response_model=SubscriptionDetail)
async def get_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение детальной информации о конкретной подписке
    """
    query = select(Subscription).where(
        and_(
            Subscription.id == subscription_id,
            Subscription.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Подписка не найдена"
        )
    
    return subscription 