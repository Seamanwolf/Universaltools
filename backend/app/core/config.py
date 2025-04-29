from pydantic import Field, validator
from pydantic_settings import BaseSettings
from typing import Optional, List, Dict, Any, Union
import os
import json
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()


class Settings(BaseSettings):
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "YouTube Downloader API"
    
    # JWT Настройки
    SECRET_KEY: str = Field(default="your-secret-key-for-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 день
    
    # Настройки базы данных
    DATABASE_URL: str = Field(
        default="mysql+aiomysql://root:root@mariadb/youtubedb"
    )
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    
    # Настройки CORS
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    
    # Настройки для загрузок
    UPLOAD_DIR: str = Field(default="/tmp/youtube-downloader")
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024 * 1024  # 5GB
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # YooKassa платежи
    YOOKASSA_SHOP_ID: Optional[str] = None
    YOOKASSA_SECRET_KEY: Optional[str] = None
    
    # Stripe платежи
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLIC_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Общие настройки платежной системы
    PAYMENT_PROVIDER: str = Field(default="test")  # "yookassa", "stripe", "test"
    PAYMENT_API_KEY: Optional[str] = None
    PAYMENT_API_SECRET: Optional[str] = None
    PAYMENT_TEST_MODE: bool = True
    PAYMENT_WEBHOOK_URL: Optional[str] = None
    
    # URL фронтенда для редиректов
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    
    # Настройки для анонимных пользователей
    ANONYMOUS_MAX_RESOLUTION: str = "480p"
    TRIAL_DOWNLOADS_LIMIT: int = 3
    
    # Redis настройки для кэширования
    REDIS_URL: Optional[str] = None
    
    # Дополнительные настройки для базы данных
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[str] = None
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_NAME: Optional[str] = None
    
    # Дополнительные настройки для Redis
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[str] = None
    REDIS_DB: Optional[str] = None
    
    # Настройки для отправки электронной почты
    SMTP_ENABLED: bool = Field(default=False)
    SMTP_SERVER: str = Field(default="smtp.example.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="user@example.com")
    SMTP_PASSWORD: str = Field(default="password")
    SMTP_FROM_EMAIL: str = Field(default="noreply@example.com")
    SUPPORT_EMAIL: str = Field(default="support@example.com")
    
    # Директория с шаблонами
    TEMPLATES_DIR: str = Field(default="/app/app/templates")
    
    # Верификация email
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 48
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 24
    
    # Отладка
    DEBUG: Optional[bool] = False
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [v]
        return v
    
    @validator("PAYMENT_API_KEY", "PAYMENT_API_SECRET", pre=True)
    def set_payment_credentials(cls, v, values):
        provider = values.get("PAYMENT_PROVIDER")
        if not v:
            if provider == "yookassa":
                if "PAYMENT_API_KEY" in values:
                    return values.get("YOOKASSA_SHOP_ID")
                else:
                    return values.get("YOOKASSA_SECRET_KEY")
            elif provider == "stripe":
                if "PAYMENT_API_KEY" in values:
                    return values.get("STRIPE_PUBLIC_KEY")
                else:
                    return values.get("STRIPE_SECRET_KEY")
        return v
    
    @validator("PAYMENT_WEBHOOK_URL", pre=True)
    def set_webhook_url(cls, v, values):
        if not v:
            api_prefix = values.get("API_V1_PREFIX")
            return f"{values.get('FRONTEND_URL')}{api_prefix}/payments/webhook"
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"  # Разрешаем дополнительные поля


settings = Settings() 