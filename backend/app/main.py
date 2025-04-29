from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import aiofiles
import os
import time

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.utils.database import get_db

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)

# Middleware для логирования запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Логируем детали запроса
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {request.headers}")
    
    # Выполняем запрос
    response = await call_next(request)
    
    # Логируем детали ответа
    process_time = time.time() - start_time
    logger.info(f"Response status: {response.status_code}, Process time: {process_time:.4f}s")
    
    return response

# Middleware для CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить любые источники для отладки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Подключение роутера API
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    logger.info(f"CORS origins: {settings.CORS_ORIGINS}")
    logger.info(f"API prefix: {settings.API_V1_PREFIX}")
    
    # Создаем директорию для загрузок, если не существует
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...") 