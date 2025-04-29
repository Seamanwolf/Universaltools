from celery import Celery
import logging
import os
from datetime import timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)

# Настройка Celery
celery = Celery(
    "youtube-downloader",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Настройки Celery
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_hijack_root_logger=False,
    worker_max_tasks_per_child=1000,
    task_soft_time_limit=300,  # 5 минут на задачу
    task_time_limit=600,  # 10 минут максимум
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Настройка периодических задач
celery.conf.beat_schedule = {
    "cleanup_old_files": {
        "task": "app.tasks.cleanup.remove_old_files",
        "schedule": timedelta(days=1),  # Запускать раз в день
        "kwargs": {"days": 30}  # Удалять файлы старше 30 дней
    },
    "check_pending_payments": {
        "task": "app.tasks.payments.check_pending_payments",
        "schedule": timedelta(minutes=15),  # Запускать каждые 15 минут
    },
    "expire_old_subscriptions": {
        "task": "app.tasks.subscriptions.expire_old_subscriptions",
        "schedule": timedelta(hours=1),  # Запускать каждый час
    }
}

# Автоматически обнаруживать задачи в указанных модулях
celery.autodiscover_tasks(["app.tasks"])

@celery.task(name="app.tasks.test_task")
def test_task():
    """Тестовая задача для проверки работы Celery"""
    logger.info("Test task executed successfully!")
    return {"status": "success", "message": "Test task executed successfully!"}

if __name__ == "__main__":
    celery.start() 