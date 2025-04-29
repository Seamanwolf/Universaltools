import logging
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.worker import celery
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.utils.database import get_async_session
from app.services.payment import PaymentService

logger = logging.getLogger(__name__)

@celery.task(name="app.tasks.payments.check_pending_payments")
def check_pending_payments():
    """
    Проверяет статус незавершенных платежей
    """
    logger.info("Checking pending payments")
    
    # Вызываем асинхронную функцию через синхронный интерфейс
    import asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_check_pending_payments_async())


async def _check_pending_payments_async():
    """
    Асинхронная реализация задачи проверки статуса платежей
    """
    payment_service = PaymentService()
    
    async for db in get_async_session():
        try:
            # Получаем все незавершенные платежи через UKassa
            query = select(Payment).where(
                Payment.status == PaymentStatus.PENDING,
                Payment.payment_method.in_([
                    PaymentMethod.UKASSA_CARD,
                    PaymentMethod.UKASSA_QR
                ])
            )
            result = await db.execute(query)
            pending_payments = result.scalars().all()
            
            logger.info(f"Found {len(pending_payments)} pending UKassa payments")
            
            completed_count = 0
            failed_count = 0
            
            # Проверяем статус каждого платежа
            for payment in pending_payments:
                # Получаем данные платежа
                payment_data = payment.payment_data
                if not payment_data:
                    continue
                
                # Извлекаем ID платежа из данных
                try:
                    import json
                    payment_json = json.loads(payment_data)
                    ukassa_payment_id = payment_json.get('id')
                    
                    if not ukassa_payment_id:
                        continue
                    
                    # Проверяем статус платежа в UKassa
                    payment_status = await payment_service.check_ukassa_payment_status(ukassa_payment_id)
                    
                    if payment_status['success']:
                        # Платеж успешно завершен
                        payment.status = PaymentStatus.COMPLETED
                        payment.transaction_id = payment_status['transaction_id']
                        db.add(payment)
                        
                        # Активируем подписку
                        subscription_id = payment.subscription_id
                        if subscription_id:
                            from app.models.subscription import Subscription
                            query = select(Subscription).where(Subscription.id == subscription_id)
                            sub_result = await db.execute(query)
                            subscription = sub_result.scalar_one_or_none()
                            
                            if subscription:
                                subscription.is_active = 1
                                subscription.payment_id = payment.transaction_id
                                db.add(subscription)
                        
                        completed_count += 1
                    elif payment_status['payment_status'] == PaymentStatus.FAILED:
                        # Платеж завершился неудачно
                        payment.status = PaymentStatus.FAILED
                        db.add(payment)
                        failed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error checking payment {payment.id}: {str(e)}")
            
            # Фиксируем изменения в БД
            await db.commit()
            
            return {
                "status": "success",
                "total_checked": len(pending_payments),
                "completed_count": completed_count,
                "failed_count": failed_count
            }
            
        except Exception as e:
            logger.exception(f"Error checking pending payments: {str(e)}")
            return {"status": "error", "message": str(e)} 