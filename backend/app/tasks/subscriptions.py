import logging
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.worker import celery
from app.models.subscription import Subscription
from app.utils.database import get_async_session

logger = logging.getLogger(__name__)

@celery.task(name="app.tasks.subscriptions.expire_old_subscriptions")
def expire_old_subscriptions():
    """
    Деактивирует подписки, срок действия которых истек
    """
    logger.info("Checking for expired subscriptions")
    
    # Вызываем асинхронную функцию через синхронный интерфейс
    import asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_expire_old_subscriptions_async())


async def _expire_old_subscriptions_async():
    """
    Асинхронная реализация задачи деактивации истекших подписок
    """
    now = datetime.utcnow()
    
    async for db in get_async_session():
        try:
            # Получаем все активные подписки с истекшим сроком действия
            query = select(Subscription).where(
                Subscription.is_active == 1,
                Subscription.end_date.isnot(None),
                Subscription.end_date < now
            )
            result = await db.execute(query)
            expired_subscriptions = result.scalars().all()
            
            logger.info(f"Found {len(expired_subscriptions)} expired subscriptions")
            
            # Обновляем статусы подписок
            for subscription in expired_subscriptions:
                subscription.is_active = 0
                db.add(subscription)
            
            # Фиксируем изменения в БД
            await db.commit()
            
            # Получаем активные подписки с исчерпанным лимитом скачиваний
            query = select(Subscription).where(
                Subscription.is_active == 1,
                Subscription.downloads_limit.isnot(None),
                Subscription.downloads_used >= Subscription.downloads_limit
            )
            result = await db.execute(query)
            limit_reached_subscriptions = result.scalars().all()
            
            logger.info(f"Found {len(limit_reached_subscriptions)} subscriptions with reached download limit")
            
            # Обновляем статусы подписок
            for subscription in limit_reached_subscriptions:
                subscription.is_active = 0
                db.add(subscription)
            
            # Фиксируем изменения в БД
            await db.commit()
            
            return {
                "status": "success",
                "expired_count": len(expired_subscriptions),
                "limit_reached_count": len(limit_reached_subscriptions)
            }
            
        except Exception as e:
            logger.exception(f"Error during subscription expiration: {str(e)}")
            return {"status": "error", "message": str(e)} 