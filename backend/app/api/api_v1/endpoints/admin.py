from fastapi import APIRouter, Depends, HTTPException, Query, Path, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc, func, or_, case
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
import logging

from app.utils.database import get_db
from app.models import (
    User, UserRole, Subscription, SubscriptionType, 
    Payment, PaymentStatus, PaymentMethod, Download
)
from app.schemas.subscription import (
    SubscriptionDetail, AdminSubscriptionCreate, AdminSubscriptionUpdate
)
from app.schemas.user import UserDetail, UserUpdate
from app.schemas.payment import PaymentDetail, AdminPaymentUpdate
from app.schemas.download import DownloadDetail
from app.api.deps import get_admin_user
from app.services.payment import get_payment_processor

router = APIRouter()
logger = logging.getLogger(__name__)

# Маршруты для управления пользователями

@router.get("/users", response_model=List[UserDetail])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение списка всех пользователей (только для админов)
    """
    query = select(User)
    
    if search:
        query = query.where(
            or_(
                User.email.contains(search),
                User.username.contains(search)
            )
        )
    
    query = query.order_by(desc(User.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение информации о конкретном пользователе (только для админов)
    """
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )
    
    return user

@router.patch("/users/{user_id}", response_model=UserDetail)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Обновление информации о пользователе (только для админов)
    """
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )
    
    # Обновление полей пользователя
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user

@router.post("/users/{user_id}/delete")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Удаление пользователя администратором
    """
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )
    
    # Удаляем пользователя
    await db.delete(user)
    await db.commit()
    
    return {"success": True}

@router.get("/user/{user_id}/history")
async def get_user_history(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение истории действий пользователя
    """
    # Проверяем существование пользователя
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )
    
    # Получаем историю подписок
    subscriptions_query = select(Subscription).where(Subscription.user_id == user_id).order_by(desc(Subscription.created_at))
    result = await db.execute(subscriptions_query)
    subscriptions = result.scalars().all()
    
    # Получаем историю платежей
    payments_query = select(Payment).where(Payment.user_id == user_id).order_by(desc(Payment.created_at))
    result = await db.execute(payments_query)
    payments = result.scalars().all()
    
    # Получаем историю скачиваний
    downloads_query = select(Download).where(Download.user_id == user_id).order_by(desc(Download.created_at))
    result = await db.execute(downloads_query)
    downloads = result.scalars().all()
    
    # Формируем общую историю
    history = []
    
    # Добавляем события подписок
    for subscription in subscriptions:
        event = {
            "date": subscription.created_at,
            "event": "Подписка",
            "details": f"Оформлена подписка типа {subscription.type.value}, активна: {'Да' if subscription.is_active else 'Нет'}"
        }
        history.append(event)
    
    # Добавляем события платежей
    for payment in payments:
        event = {
            "date": payment.created_at,
            "event": "Платеж",
            "details": f"Платеж на сумму {payment.amount} руб., статус: {payment.status.value}"
        }
        history.append(event)
    
    # Добавляем события скачиваний
    for download in downloads:
        event = {
            "date": download.created_at,
            "event": "Скачивание",
            "details": f"Скачивание видео {download.video_title or download.video_id}, статус: {download.status}"
        }
        history.append(event)
    
    # Добавляем событие регистрации
    history.append({
        "date": user.created_at,
        "event": "Регистрация",
        "details": "Пользователь зарегистрировался в системе"
    })
    
    # Сортируем историю по дате (от новых к старым)
    history.sort(key=lambda x: x["date"], reverse=True)
    
    return history

# Маршруты для управления подписками

@router.get("/subscriptions", response_model=List[SubscriptionDetail])
async def list_subscriptions(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    is_active: Optional[int] = None,
    subscription_type: Optional[SubscriptionType] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение списка всех подписок с возможностью фильтрации (только для админов)
    """
    query = select(Subscription)
    
    if user_id is not None:
        query = query.where(Subscription.user_id == user_id)
    
    if is_active is not None:
        query = query.where(Subscription.is_active == is_active)
    
    if subscription_type is not None:
        query = query.where(Subscription.type == subscription_type)
    
    query = query.order_by(desc(Subscription.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    return subscriptions

@router.post("/subscriptions", response_model=SubscriptionDetail)
async def create_subscription(
    subscription_create: AdminSubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Создание подписки для пользователя администратором (ручное создание)
    """
    # Проверяем существование пользователя
    query = select(User).where(User.id == subscription_create.user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {subscription_create.user_id} не найден"
        )
    
    # Создаем подписку
    now = datetime.utcnow()
    
    # Получаем план подписки для установки правильных значений
    from app.api.api_v1.endpoints.subscriptions import SUBSCRIPTION_PLANS
    
    plan_data = SUBSCRIPTION_PLANS.get(subscription_create.type, {})
    
    end_date = None
    if subscription_create.end_date:
        end_date = subscription_create.end_date
    elif plan_data.get("duration_days"):
        end_date = now + timedelta(days=plan_data["duration_days"])
    
    downloads_limit = None
    if subscription_create.downloads_limit is not None:
        downloads_limit = subscription_create.downloads_limit
    elif plan_data.get("downloads_limit") is not None:
        downloads_limit = plan_data["downloads_limit"]
    
    subscription = Subscription(
        user_id=subscription_create.user_id,
        type=subscription_create.type,
        start_date=now,
        end_date=end_date,
        downloads_limit=downloads_limit,
        downloads_used=0,
        price=subscription_create.price,
        is_active=subscription_create.is_active
    )
    
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    
    # Если подписка активна, создаем запись о ручном платеже
    if subscription.is_active:
        payment = Payment(
            user_id=subscription_create.user_id,
            subscription_id=subscription.id,
            amount=subscription_create.price,
            payment_method=PaymentMethod.ADMIN_MANUAL,
            status=PaymentStatus.COMPLETED,
            transaction_id=f"manual_admin_{admin_user.id}_{now.strftime('%Y%m%d%H%M%S')}"
        )
        
        db.add(payment)
        await db.commit()
        
        # Связываем подписку с платежом
        subscription.payment_id = payment.transaction_id
        db.add(subscription)
        await db.commit()
        await db.refresh(subscription)
    
    return subscription

@router.patch("/subscriptions/{subscription_id}", response_model=SubscriptionDetail)
async def update_subscription(
    subscription_id: int,
    subscription_update: AdminSubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Обновление подписки администратором
    """
    query = select(Subscription).where(Subscription.id == subscription_id)
    result = await db.execute(query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Подписка с ID {subscription_id} не найдена"
        )
    
    # Обновление полей подписки
    for field, value in subscription_update.dict(exclude_unset=True).items():
        setattr(subscription, field, value)
    
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)
    
    return subscription

# Маршруты для управления платежами

@router.get("/payments", response_model=List[PaymentDetail])
async def list_payments(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    status: Optional[PaymentStatus] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение списка всех платежей с возможностью фильтрации (только для админов)
    """
    query = select(Payment)
    
    if user_id is not None:
        query = query.where(Payment.user_id == user_id)
    
    if status is not None:
        query = query.where(Payment.status == status)
    
    query = query.order_by(desc(Payment.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    payments = result.scalars().all()
    
    return payments

@router.patch("/payments/{payment_id}", response_model=PaymentDetail)
async def update_payment(
    payment_id: int,
    payment_update: AdminPaymentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Обновление статуса платежа администратором
    """
    query = select(Payment).where(Payment.id == payment_id)
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Платеж с ID {payment_id} не найден"
        )
    
    # Обновление полей платежа
    for field, value in payment_update.dict(exclude_unset=True).items():
        setattr(payment, field, value)
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    # Если статус изменен на COMPLETED, активируем связанную подписку
    if payment_update.status == PaymentStatus.COMPLETED:
        payment_processor = get_payment_processor(payment.payment_method.value)
        
        background_tasks.add_task(
            payment_processor.update_payment_status,
            payment_id=payment.id,
            status=PaymentStatus.COMPLETED,
            transaction_id=payment.transaction_id or f"admin_updated_{admin_user.id}"
        )
    
    return payment

# Маршруты для управления скачиваниями

@router.get("/downloads", response_model=List[DownloadDetail])
async def list_downloads(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    subscription_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение списка всех скачиваний с возможностью фильтрации (только для админов)
    """
    query = select(Download)
    
    if user_id is not None:
        query = query.where(Download.user_id == user_id)
    
    if subscription_id is not None:
        query = query.where(Download.subscription_id == subscription_id)
    
    if status is not None:
        query = query.where(Download.status == status)
    
    query = query.order_by(desc(Download.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    downloads = result.scalars().all()
    
    return downloads

# Маршрут для статистики

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение основной статистики по сервису (только для админов)
    """
    # Общее количество пользователей
    users_query = select(func.count(User.id))
    result = await db.execute(users_query)
    total_users = result.scalar_one()
    
    # Количество активных подписок
    active_subs_query = select(func.count(Subscription.id)).where(Subscription.is_active == 1)
    result = await db.execute(active_subs_query)
    active_subscriptions = result.scalar_one()
    
    # Общая сумма успешных платежей
    payments_query = select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED)
    result = await db.execute(payments_query)
    total_revenue = result.scalar_one() or 0
    
    # Общее количество скачиваний
    downloads_query = select(func.count(Download.id))
    result = await db.execute(downloads_query)
    total_downloads = result.scalar_one()
    
    # Количество успешных скачиваний
    successful_downloads_query = select(func.count(Download.id)).where(Download.status == "completed")
    result = await db.execute(successful_downloads_query)
    successful_downloads = result.scalar_one()
    
    # Количество пользователей с пробной подпиской
    trial_users_query = select(func.count(User.id)).where(
        User.id.in_(
            select(Subscription.user_id).where(Subscription.type == SubscriptionType.TRIAL)
        )
    )
    result = await db.execute(trial_users_query)
    trial_users = result.scalar_one()
    
    # Статистика по типам подписок
    sub_type_stats = {}
    for sub_type in SubscriptionType:
        query = select(func.count(Subscription.id)).where(Subscription.type == sub_type)
        result = await db.execute(query)
        sub_type_stats[sub_type.value] = result.scalar_one()
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subscriptions,
        "total_revenue": total_revenue,
        "total_downloads": total_downloads,
        "successful_downloads": successful_downloads,
        "trial_users": trial_users,
        "subscription_types": sub_type_stats
    }

@router.get("/downloads/stats")
async def get_downloads_stats(
    start_date: Optional[datetime] = Query(None, description="Начальная дата (формат: YYYY-MM-DD)"),
    end_date: Optional[datetime] = Query(None, description="Конечная дата (формат: YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_admin_user)
):
    """
    Получение статистики скачиваний по дням (только для админов)
    """
    # Если даты не указаны, берем последние 30 дней
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Приводим к началу и концу дня
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Запрос для получения данных по дням
    query = select(
        func.date(Download.created_at).label("date"),
        func.count(Download.id).label("total"),
        func.sum(case((Download.status == "completed", 1), else_=0)).label("successful"),
        func.sum(case((Download.status == "failed", 1), else_=0)).label("failed"),
        func.sum(case((Download.status == "processing", 1), else_=0)).label("processing")
    ).where(
        Download.created_at.between(start_date, end_date)
    ).group_by(
        func.date(Download.created_at)
    ).order_by(
        func.date(Download.created_at)
    )
    
    result = await db.execute(query)
    daily_stats = []
    
    for row in result:
        daily_stats.append({
            "date": row.date.strftime("%Y-%m-%d"),
            "total": row.total,
            "successful": row.successful,
            "failed": row.failed,
            "processing": row.processing
        })
    
    # Если нет данных за некоторые дни в диапазоне, добавляем нулевые значения
    current_date = start_date
    complete_stats = []
    
    dates_with_data = {item["date"] for item in daily_stats}
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        
        if date_str in dates_with_data:
            # Находим имеющиеся данные
            day_data = next(item for item in daily_stats if item["date"] == date_str)
            complete_stats.append(day_data)
        else:
            # Добавляем нулевые данные
            complete_stats.append({
                "date": date_str,
                "total": 0,
                "successful": 0,
                "failed": 0,
                "processing": 0
            })
        
        current_date += timedelta(days=1)
    
    # Получаем статистику по типам подписок
    subscription_stats_query = select(
        Subscription.type,
        func.count(Download.id).label("downloads_count")
    ).join(
        Download, Download.subscription_id == Subscription.id
    ).where(
        Download.created_at.between(start_date, end_date)
    ).group_by(
        Subscription.type
    )
    
    result = await db.execute(subscription_stats_query)
    subscription_stats = {row.type.value: row.downloads_count for row in result}
    
    return {
        "daily_stats": complete_stats,
        "subscription_stats": subscription_stats,
        "summary": {
            "period_start": start_date.strftime("%Y-%m-%d"),
            "period_end": end_date.strftime("%Y-%m-%d"),
            "total_downloads": sum(day["total"] for day in complete_stats),
            "successful_downloads": sum(day["successful"] for day in complete_stats),
            "failed_downloads": sum(day["failed"] for day in complete_stats)
        }
    } 