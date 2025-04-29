from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
import os
import aiofiles
import asyncio
import logging
import shutil
import uuid
from datetime import datetime

from app.utils.database import get_db
from app.models import Download, SourceType, Resolution, User, Subscription, SubscriptionType
from app.schemas.download import DownloadCreate, DownloadResponse, DownloadDetail, DownloadVideoRequest, VideoInfo, ConvertVideoRequest
from app.services.downloader import VideoDownloader
from app.api.deps import get_current_user, get_optional_user, check_subscription_active
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Инициализируем сервис загрузки
downloader = VideoDownloader()

@router.post("/", response_model=DownloadResponse)
async def create_download(
    download_create: DownloadCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Запрос на скачивание видео. Проверяет наличие активной подписки и запускает процесс скачивания в фоне.
    """
    # Определяем тип источника
    source_type = detect_source_type(download_create.url)
    
    # Проверяем права на скачивание с указанным разрешением
    can_download, subscription_id = await check_download_access(
        db, current_user.id, source_type, download_create.resolution
    )
    
    if not can_download:
        raise HTTPException(
            status_code=403, 
            detail="Нет активной подписки или достигнут лимит скачиваний для указанного разрешения"
        )
    
    # Создаем запись о скачивании
    download = Download(
        user_id=current_user.id,
        subscription_id=subscription_id,
        source_url=download_create.url,
        source_type=source_type,
        resolution=download_create.resolution,
        file_path="pending",  # Временное значение
        status="in_progress"
    )
    
    db.add(download)
    await db.commit()
    await db.refresh(download)
    
    # Запускаем скачивание в фоне
    background_tasks.add_task(
        process_download,
        download_id=download.id,
        url=download_create.url,
        resolution=download_create.resolution,
        user_id=current_user.id,
        subscription_id=subscription_id
    )
    
    return DownloadResponse(
        id=download.id,
        status="in_progress",
        message="Видео поставлено в очередь на скачивание"
    )

@router.get("/", response_model=List[DownloadDetail])
async def list_downloads(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение списка скачиваний текущего пользователя
    """
    query = select(Download).where(Download.user_id == current_user.id).offset(skip).limit(limit)
    result = await db.execute(query)
    downloads = result.scalars().all()
    
    return downloads

@router.get("/{download_id}", response_model=DownloadDetail)
async def get_download(
    download_id: int = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение детальной информации о конкретном скачивании
    """
    query = select(Download).where(
        and_(Download.id == download_id, Download.user_id == current_user.id)
    )
    result = await db.execute(query)
    download = result.scalar_one_or_none()
    
    if not download:
        raise HTTPException(status_code=404, detail="Скачивание не найдено")
    
    return download

@router.post("/info", response_model=VideoInfo)
async def get_video_info(
    request: DownloadVideoRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Получение информации о видео с указанного URL.
    Поддерживает анонимный режим с ограниченным списком форматов.
    """
    info = await downloader.get_video_info(request.url)
    
    if "error" in info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка получения информации о видео: {info['error']}"
        )
    
    # Для неавторизованных пользователей ограничиваем доступные разрешения
    if not current_user:
        # Фильтруем форматы, оставляя только те, что разрешены для анонимных пользователей
        allowed_formats = []
        for fmt in info.get("formats", []):
            resolution = fmt.get("resolution", "")
            # Проверяем, что разрешение не превышает максимальное для анонимных пользователей
            if resolution and resolution in ["240p", "360p", "480p"]:
                allowed_formats.append(fmt)
        
        info["formats"] = allowed_formats
        info["anonymous_mode"] = True
    
    return info

@router.post("", response_model=DownloadResponse)
async def download_video(
    request: DownloadVideoRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Скачивание видео с указанного URL.
    Поддерживает анонимный режим с ограничением качества.
    """
    # Определяем разрешение видео
    resolution = request.resolution or "480p"
    
    # Проверка для неавторизованных пользователей
    if not current_user:
        # Для анонимных пользователей ограничиваем разрешение
        max_anonymous_resolution = settings.ANONYMOUS_MAX_RESOLUTION
        
        # Проверяем, что запрошенное разрешение не превышает максимально допустимое
        if resolution not in ["240p", "360p", "480p"] or _compare_resolutions(resolution, max_anonymous_resolution) > 0:
            resolution = max_anonymous_resolution
            logger.info(f"Anonymous user requested resolution limited to {resolution}")
    else:
        # Для авторизованных пользователей проверяем подписку
        # Получаем активные подписки пользователя
        query = select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.is_active == 1
        )
        result = await db.execute(query)
        active_subscription = result.scalar_one_or_none()
        
        if not active_subscription:
            # У пользователя нет активной подписки, проверяем наличие пробной подписки
            # или создаем её, если это первая загрузка
            
            # Ищем пробную подписку
            query = select(Subscription).where(
                Subscription.user_id == current_user.id,
                Subscription.type == SubscriptionType.TRIAL
            )
            result = await db.execute(query)
            trial_subscription = result.scalar_one_or_none()
            
            if not trial_subscription:
                # Создаем пробную подписку
                trial_subscription = Subscription(
                    user_id=current_user.id,
                    type=SubscriptionType.TRIAL,
                    start_date=datetime.utcnow(),
                    downloads_limit=settings.TRIAL_DOWNLOADS_LIMIT,
                    downloads_used=0,
                    price=0.0,
                    is_active=1
                )
                db.add(trial_subscription)
                await db.commit()
                await db.refresh(trial_subscription)
                
                active_subscription = trial_subscription
            elif trial_subscription.downloads_used >= (trial_subscription.downloads_limit or settings.TRIAL_DOWNLOADS_LIMIT):
                # Пробная подписка исчерпана
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Пробная подписка исчерпана. Пожалуйста, приобретите подписку."
                )
            else:
                active_subscription = trial_subscription
    
    # Создаем уникальный идентификатор для загрузки
    download_id = str(uuid.uuid4())
    
    # Создаем директорию для загрузки, если не существует
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Создаем поддиректорию для текущей загрузки
    download_dir = os.path.join(settings.UPLOAD_DIR, download_id)
    os.makedirs(download_dir, exist_ok=True)
    
    # Определяем тип источника по URL
    source_type = downloader.determine_source_type(request.url)
    
    # Выполняем загрузку видео
    try:
        # Сначала запускаем загрузку, чтобы получить начальную информацию
        filename_template = "%(title)s.%(ext)s"
        
        if source_type == "instagram" and request.use_instaloader:
            # Для Instagram используем instaloader, если запрошено
            download_result = await downloader.download_instagram_with_instaloader(
                url=request.url,
                output_dir=download_dir
            )
        else:
            # Для остальных платформ используем yt-dlp
            download_result = await downloader.download_video(
                url=request.url,
                resolution=resolution,
                output_dir=download_dir,
                filename_template=filename_template
            )
        
        if not download_result.success:
            # Удаляем директорию в случае ошибки
            shutil.rmtree(download_dir, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка скачивания видео: {download_result.error}"
            )
        
        # Сохраняем информацию о загрузке в БД, если пользователь авторизован
        if current_user:
            download = Download(
                user_id=current_user.id,
                subscription_id=active_subscription.id if active_subscription else None,
                source_url=request.url,
                source_type=_get_source_type(source_type),
                title=download_result.title,
                resolution=_get_resolution(resolution),
                file_path=download_result.file_path,
                file_size=download_result.file_size,
                duration=download_result.duration,
                status="completed"
            )
            
            db.add(download)
            
            # Обновляем количество использованных скачиваний подписки
            if active_subscription:
                active_subscription.downloads_used += 1
                db.add(active_subscription)
            
            await db.commit()
            await db.refresh(download)
        
        # Получаем относительный путь к файлу для URL
        relative_path = os.path.relpath(download_result.file_path, settings.UPLOAD_DIR)
        download_url = f"/api/v1/downloads/file/{relative_path}"
        
        return DownloadResponse(
            id=download_id,
            title=download_result.title,
            url=download_url,
            file_size=download_result.file_size,
            resolution=resolution,
            duration=download_result.duration
        )
        
    except Exception as e:
        # Удаляем директорию в случае ошибки
        shutil.rmtree(download_dir, ignore_errors=True)
        logger.exception(f"Error downloading video from {request.url}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.post("/convert", response_model=DownloadResponse)
async def convert_video(
    request: ConvertVideoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Конвертирует видео в указанный формат.
    Требует авторизации и активной подписки.
    """
    # Проверяем наличие активной подписки
    await check_subscription_active(db, current_user.id)
    
    # Проверяем, существует ли исходный файл
    if not os.path.exists(request.input_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Исходный файл не найден"
        )
    
    # Проверяем, принадлежит ли файл текущему пользователю
    query = select(Download).where(
        Download.user_id == current_user.id,
        Download.file_path == request.input_file
    )
    result = await db.execute(query)
    download = result.scalar_one_or_none()
    
    if not download:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав на конвертацию данного файла"
        )
    
    # Создаем директорию для результата конвертации
    output_dir = os.path.dirname(request.input_file)
    
    try:
        # Запускаем процесс конвертации
        convert_result = await downloader.convert_video(
            input_path=request.input_file,
            output_format=request.output_format,
            output_dir=output_dir
        )
        
        if not convert_result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка конвертации: {convert_result.error}"
            )
        
        # Сохраняем информацию о конвертированном файле
        converted_download = Download(
            user_id=current_user.id,
            subscription_id=download.subscription_id,
            source_url=download.source_url,
            source_type=download.source_type,
            title=f"{download.title} (converted to {request.output_format})",
            resolution=download.resolution,
            file_path=convert_result.file_path,
            file_size=convert_result.file_size,
            duration=download.duration,
            status="completed"
        )
        
        db.add(converted_download)
        await db.commit()
        await db.refresh(converted_download)
        
        # Получаем относительный путь к файлу для URL
        relative_path = os.path.relpath(convert_result.file_path, settings.UPLOAD_DIR)
        download_url = f"/api/v1/downloads/file/{relative_path}"
        
        return DownloadResponse(
            id=str(converted_download.id),
            title=converted_download.title,
            url=download_url,
            file_size=converted_download.file_size,
            resolution=str(converted_download.resolution.value),
            duration=converted_download.duration
        )
        
    except Exception as e:
        logger.exception(f"Error converting video {request.input_file}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.get("/file/{file_path:path}")
async def serve_file(
    file_path: str,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Отдает скачанный файл пользователю.
    Для авторизованных пользователей проверяет права.
    """
    full_path = os.path.join(settings.UPLOAD_DIR, file_path)
    
    # Проверяем существование файла
    if not os.path.exists(full_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл не найден"
        )
    
    # Для анонимных пользователей разрешаем только доступ к файлам в формате низкого качества
    if not current_user:
        # Проверяем разрешение файла (предполагается, что оно указано в имени файла)
        if any(res in file_path.lower() for res in ["720", "1080", "hd", "fullhd", "2k", "4k"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Для скачивания файлов высокого качества требуется авторизация"
            )
    
    from fastapi.responses import FileResponse
    return FileResponse(full_path)

@router.get("/history", response_model=List[DownloadResponse])
async def get_download_history(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение истории загрузок текущего пользователя
    """
    query = select(Download).where(Download.user_id == current_user.id).order_by(
        Download.created_at.desc()
    ).limit(limit).offset(offset)
    
    result = await db.execute(query)
    downloads = result.scalars().all()
    
    return [
        DownloadResponse(
            id=str(download.id),
            title=download.title,
            url=f"/api/v1/downloads/file/{os.path.relpath(download.file_path, settings.UPLOAD_DIR)}",
            file_size=download.file_size,
            resolution=download.resolution.value,
            duration=download.duration
        )
        for download in downloads
    ]

# Вспомогательные функции

def detect_source_type(url: str) -> SourceType:
    """Определяет тип источника по URL"""
    url = url.lower()
    if "youtube.com" in url or "youtu.be" in url:
        return SourceType.YOUTUBE
    elif "tiktok.com" in url:
        return SourceType.TIKTOK
    elif "vk.com" in url:
        return SourceType.VK
    elif "instagram.com" in url:
        return SourceType.INSTAGRAM
    else:
        return SourceType.OTHER

async def check_download_access(
    db: AsyncSession, user_id: int, source_type: SourceType, resolution: Resolution
) -> tuple[bool, Optional[int]]:
    """
    Проверяет, имеет ли пользователь право на скачивание видео с указанным разрешением.
    Возвращает (может_скачать, id_подписки)
    """
    # Для неавторизованных пользователей и бесплатного режима (360p, 480p)
    if resolution in [Resolution.RES_360P, Resolution.RES_480P]:
        # Ищем активную пробную подписку
        query = select(Subscription).where(
            and_(
                Subscription.user_id == user_id,
                Subscription.is_active == 1,
                Subscription.type == SubscriptionType.TRIAL,
                Subscription.downloads_used < Subscription.downloads_limit
            )
        )
        result = await db.execute(query)
        trial_sub = result.scalar_one_or_none()
        
        if trial_sub:
            return True, trial_sub.id
        
        # Иначе разрешаем без подписки
        return True, None
    
    # Для более высоких разрешений требуется подписка
    # Ищем активные подписки пользователя
    query = select(Subscription).where(
        and_(
            Subscription.user_id == user_id,
            Subscription.is_active == 1
        )
    )
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    for sub in subscriptions:
        # Проверяем, что подписка не исчерпала лимит скачиваний
        if sub.type in [SubscriptionType.ONE_TIME, SubscriptionType.PACK_10, SubscriptionType.TRIAL]:
            if sub.downloads_used >= sub.downloads_limit:
                continue
        
        # Подписка действительна
        return True, sub.id
    
    # Нет действующих подписок
    return False, None

async def process_download(
    download_id: int, 
    url: str, 
    resolution: Resolution,
    user_id: int,
    subscription_id: Optional[int]
):
    """
    Фоновая задача для скачивания видео.
    Обновляет запись в БД после завершения скачивания.
    """
    try:
        # Создаем асинхронную сессию базы данных
        async with AsyncSessionLocal() as db:
            # Получаем загрузку из БД
            query = select(Download).where(Download.id == download_id)
            result = await db.execute(query)
            download = result.scalar_one_or_none()
            
            if not download:
                logger.error(f"Download ID {download_id} not found in DB")
                return
            
            # Создаем директорию для пользователя
            user_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
            os.makedirs(user_dir, exist_ok=True)
            
            # Запускаем скачивание
            downloader = VideoDownloader()
            result = await downloader.download_video(
                url=url,
                resolution=resolution.value,
                output_dir=user_dir
            )
            
            if not result.success:
                # Обновляем статус в БД при ошибке
                download.status = "failed"
                db.add(download)
                await db.commit()
                logger.error(f"Download failed: {result.error}")
                return
            
            # Обновляем запись в БД
            download.title = result.title
            download.file_path = result.file_path
            download.file_size = result.file_size
            download.duration = result.duration
            download.status = "completed"
            db.add(download)
            
            # Если есть подписка, обновляем счетчик скачиваний
            if subscription_id:
                query = select(Subscription).where(Subscription.id == subscription_id)
                result = await db.execute(query)
                subscription = result.scalar_one_or_none()
                
                if subscription:
                    subscription.downloads_used += 1
                    db.add(subscription)
            
            await db.commit()
            
    except Exception as e:
        logger.exception(f"Error during download process: {str(e)}")
        
        # Обновляем статус в БД при любой другой ошибке
        async with AsyncSessionLocal() as db:
            query = select(Download).where(Download.id == download_id)
            result = await db.execute(query)
            download = result.scalar_one_or_none()
            
            if download:
                download.status = "failed"
                db.add(download)
                await db.commit()

def _get_source_type(source_type_str: str) -> SourceType:
    """Преобразует строковый тип источника в enum"""
    mapping = {
        "youtube": SourceType.YOUTUBE,
        "tiktok": SourceType.TIKTOK,
        "vk": SourceType.VK,
        "instagram": SourceType.INSTAGRAM
    }
    return mapping.get(source_type_str, SourceType.OTHER)

def _get_resolution(resolution_str: str) -> Resolution:
    """Преобразует строковое разрешение в enum"""
    mapping = {
        "360p": Resolution.RES_360P,
        "480p": Resolution.RES_480P,
        "720p": Resolution.RES_720P,
        "1080p": Resolution.RES_1080P,
        "1440p": Resolution.RES_1440P,
        "2160p": Resolution.RES_2160P,
        "audio_only": Resolution.AUDIO_ONLY
    }
    return mapping.get(resolution_str, Resolution.RES_480P)

def _compare_resolutions(res1: str, res2: str) -> int:
    """
    Сравнивает два разрешения
    Возвращает:
     -1 если res1 < res2
      0 если res1 == res2
      1 если res1 > res2
    """
    res_order = {
        "240p": 1,
        "360p": 2,
        "480p": 3,
        "720p": 4,
        "1080p": 5,
        "1440p": 6,
        "2160p": 7,
        "audio_only": 0
    }
    
    res1_val = res_order.get(res1, 0)
    res2_val = res_order.get(res2, 0)
    
    if res1_val < res2_val:
        return -1
    elif res1_val > res2_val:
        return 1
    else:
        return 0 