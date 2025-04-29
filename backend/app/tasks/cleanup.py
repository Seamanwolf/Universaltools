import os
import logging
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.worker import celery
from app.models.download import Download
from app.utils.database import get_async_session
from app.core.config import settings

logger = logging.getLogger(__name__)

@celery.task(name="app.tasks.cleanup.remove_old_files")
def remove_old_files(days: int = 30):
    """
    Удаляет файлы старше указанного количества дней
    и обновляет статус в базе данных
    
    Args:
        days: Количество дней, после которых файлы считаются устаревшими
    """
    logger.info(f"Starting cleanup of files older than {days} days")
    
    # Вызываем асинхронную функцию через синхронный интерфейс
    import asyncio
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(_remove_old_files_async(days))


async def _remove_old_files_async(days: int = 30):
    """
    Асинхронная реализация задачи удаления старых файлов
    
    Args:
        days: Количество дней, после которых файлы считаются устаревшими
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    async for db in get_async_session():
        try:
            # Получаем все записи о скачиваниях старше cutoff_date
            query = select(Download).where(Download.created_at < cutoff_date)
            result = await db.execute(query)
            old_downloads = result.scalars().all()
            
            logger.info(f"Found {len(old_downloads)} downloads older than {days} days")
            
            removed_count = 0
            error_count = 0
            
            for download in old_downloads:
                # Проверяем существование файла
                if os.path.exists(download.file_path):
                    try:
                        # Удаляем файл
                        os.remove(download.file_path)
                        removed_count += 1
                        
                        # Обновляем статус в базе данных
                        download.status = "removed"
                        db.add(download)
                    except Exception as e:
                        error_count += 1
                        logger.error(f"Error removing file {download.file_path}: {str(e)}")
            
            # Фиксируем изменения в БД
            await db.commit()
            
            return {
                "status": "success",
                "removed_count": removed_count,
                "error_count": error_count,
                "total_found": len(old_downloads)
            }
            
        except Exception as e:
            logger.exception(f"Error during file cleanup: {str(e)}")
            return {"status": "error", "message": str(e)} 