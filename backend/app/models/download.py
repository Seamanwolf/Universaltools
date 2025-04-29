from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from app.db.base_class import Base


class DownloadStatus(enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DownloadFormat(enum.Enum):
    MP4 = "mp4"
    MP3 = "mp3"
    WAV = "wav"


class SourceType(enum.Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    VKONTAKTE = "vk"
    OTHER = "other"


class Resolution(enum.Enum):
    R240P = "240p"
    R360P = "360p"
    R480P = "480p"
    R720P = "720p"
    R1080P = "1080p"
    R1440P = "1440p"
    R2160P = "2160p"


class Download(Base):
    """Модель загрузки видео."""
    __tablename__ = "downloads"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(255), nullable=False)
    title = Column(String(255), nullable=True)
    format = Column(Enum(DownloadFormat), default=DownloadFormat.MP4)
    status = Column(Enum(DownloadStatus), default=DownloadStatus.PENDING)
    file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Внешний ключ для связи с пользователем (может быть NULL для анонимных загрузок)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Обратная связь с пользователем
    user = relationship("User", back_populates="downloads")

    # Не добавляем обратное отношение к subscription, так как оно не обязательно и может вызвать проблемы
    # при удалении подписки 