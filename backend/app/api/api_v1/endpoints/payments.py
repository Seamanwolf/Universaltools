from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Path, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime
import logging
import json

from app.utils.database import get_db
from app.models import User, Payment, PaymentStatus, PaymentMethod, Subscription
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentDetail, PaymentCallback
from app.api.deps import get_current_user
from app.services.payment import get_payment_processor

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/create", response_model=PaymentResponse)
async def create_payment(
    payment_create: PaymentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Создание нового платежа
    """
    from app.api.api_v1.endpoints.subscriptions import SUBSCRIPTION_PLANS
    
    # Проверяем, что тип подписки существует
    if payment_create.subscription_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип подписки: {payment_create.subscription_type}"
        )
    
    # Получаем информацию о плане подписки
    plan = SUBSCRIPTION_PLANS[payment_create.subscription_type]
    
    # Создаем подписку
    now = datetime.utcnow()
    from datetime import timedelta
    
    end_date = None
    if plan.get("duration_days"):
        end_date = now + timedelta(days=plan["duration_days"])
    
    subscription = Subscription(
        user_id=current_user.id,
        type=payment_create.subscription_type,
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
    
    # Создаем платеж
    payment = Payment(
        user_id=current_user.id,
        subscription_id=subscription.id,
        amount=plan["price"],
        payment_method=payment_create.payment_method,
        status=PaymentStatus.PENDING
    )
    
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    
    # Получаем процессор платежей и обрабатываем платеж
    payment_processor = get_payment_processor(payment_create.payment_method.value)
    
    # Запускаем обработку платежа в фоне
    background_tasks.add_task(
        payment_processor.process_payment,
        payment_id=payment.id,
        amount=payment.amount,
        description=f"Подписка {plan['name']}",
        user_id=current_user.id,
        subscription_id=subscription.id
    )
    
    # Формируем ответ
    return PaymentResponse(
        id=payment.id,
        status=payment.status,
        amount=payment.amount,
        message="Платеж инициирован"
    )

@router.get("/", response_model=List[PaymentDetail])
async def list_payments(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка платежей текущего пользователя
    """
    query = select(Payment).where(
        Payment.user_id == current_user.id
    ).order_by(desc(Payment.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    payments = result.scalars().all()
    
    return payments

@router.get("/{payment_id}", response_model=PaymentDetail)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение информации о конкретном платеже
    """
    query = select(Payment).where(
        and_(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платеж не найден"
        )
    
    return payment

@router.post("/callback")
async def payment_callback(
    callback_data: PaymentCallback,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Обработка обратного вызова от платежной системы
    """
    try:
        # Получаем дополнительные данные запроса
        headers = dict(request.headers)
        
        logger.info(f"Payment callback received: {callback_data.dict()}")
        logger.info(f"Headers: {headers}")
        
        # Проверяем существование платежа по transaction_id
        query = select(Payment).where(Payment.transaction_id == callback_data.payment_id)
        result = await db.execute(query)
        payment = result.scalar_one_or_none()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Платеж с transaction_id {callback_data.payment_id} не найден"
            )
        
        # Определяем новый статус платежа
        new_status = None
        if callback_data.status.lower() in ["succeeded", "completed", "paid"]:
            new_status = PaymentStatus.COMPLETED
        elif callback_data.status.lower() in ["canceled", "failed"]:
            new_status = PaymentStatus.FAILED
        else:
            new_status = PaymentStatus.PENDING
        
        # Обновляем статус платежа
        payment_processor = get_payment_processor(payment.payment_method.value)
        
        background_tasks.add_task(
            payment_processor.update_payment_status,
            payment_id=payment.id,
            status=new_status
        )
        
        return {"status": "success", "message": "Callback processed"}
        
    except Exception as e:
        logger.exception(f"Error processing payment callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка обработки обратного вызова: {str(e)}"
        )

@router.post("/check/{payment_id}")
async def check_payment(
    payment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ручная проверка статуса платежа
    """
    query = select(Payment).where(
        and_(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        )
    )
    
    result = await db.execute(query)
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платеж не найден"
        )
    
    if payment.status == PaymentStatus.COMPLETED:
        return {"status": "success", "message": "Платеж уже завершен"}
    
    # Проверяем статус платежа через процессор
    payment_processor = get_payment_processor(payment.payment_method.value)
    
    background_tasks.add_task(
        payment_processor.check_payment,
        payment_id=payment.id
    )
    
    return {"status": "pending", "message": "Запрос на проверку статуса платежа отправлен"} 