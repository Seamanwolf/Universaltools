from pydantic import BaseModel, Field, HttpUrl, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import enum

# Создаем локальные enum вместо импорта из моделей
class Resolution(str, enum.Enum):
    RES_240P = "240p"
    RES_360P = "360p"
    RES_480P = "480p"
    RES_720P = "720p"
    RES_1080P = "1080p"
    RES_1440P = "1440p"
    RES_2160P = "2160p"
    AUDIO_ONLY = "audio_only"

class SourceType(str, enum.Enum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    VIMEO = "vimeo"
    OTHER = "other"

class DownloadVideoRequest(BaseModel):
    url: str = Field(..., description="URL видео для скачивания")
    resolution: Optional[str] = Field(None, description="Разрешение видео (360p, 480p, 720p, 1080p, etc)")
    use_instaloader: bool = Field(False, description="Использовать instaloader для скачивания из Instagram")
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL должен начинаться с http:// или https://')
        return v
    
    @validator('resolution')
    def validate_resolution(cls, v):
        if v is None:
            return v
        valid_resolutions = ["240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "audio_only"]
        if v not in valid_resolutions:
            raise ValueError(f"Разрешение должно быть одним из: {', '.join(valid_resolutions)}")
        return v

class DownloadResponse(BaseModel):
    id: str
    title: str
    url: str
    file_size: Optional[int] = None
    resolution: str
    duration: Optional[int] = None

class DownloadDetail(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    format: Optional[str] = None
    status: str
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class VideoInfo(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    formats: List[Dict[str, Any]] = []
    extractor: Optional[str] = None
    source_type: Optional[str] = None
    anonymous_mode: Optional[bool] = False

class ConvertVideoRequest(BaseModel):
    input_file: str = Field(..., description="Путь к исходному видео")
    output_format: str = Field(..., description="Формат вывода (mp3, mp4, etc)")
    
    @validator('output_format')
    def validate_format(cls, v):
        valid_formats = ["mp3", "mp4", "webm", "mkv", "m4a", "ogg", "avi"]
        if v not in valid_formats:
            raise ValueError(f"Формат должен быть одним из: {', '.join(valid_formats)}")
        return v

class DownloadCreate(BaseModel):
    url: str = Field(..., description="URL видео для скачивания")
    resolution: Resolution = Field(default=Resolution.RES_720P, description="Разрешение видео")
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL должен начинаться с http:// или https://')
        return v 