import os
import asyncio
import logging
import re
import tempfile
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class DownloadResult:
    success: bool
    file_path: str = ""
    title: str = ""
    file_size: Optional[int] = None
    duration: Optional[int] = None
    error: str = ""


class VideoDownloader:
    """Сервис для скачивания видео с различных платформ с использованием yt-dlp"""
    
    async def download_video(
        self, url: str, resolution: str, output_dir: str, filename_template: str = "%(id)s.%(ext)s"
    ) -> DownloadResult:
        """
        Скачивает видео с указанного URL с заданным разрешением
        
        Args:
            url: URL видео для скачивания
            resolution: Разрешение видео (360p, 480p, 720p и т.д.)
            output_dir: Директория для сохранения видео
            filename_template: Шаблон имени файла для yt-dlp
            
        Returns:
            DownloadResult с результатами скачивания
        """
        try:
            # Определяем тип источника
            source_type = self.determine_source_type(url)
            
            # Создаем временную директорию для файла конфигурации
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as temp_file:
                temp_file_path = temp_file.name
                
                # Формируем опции для yt-dlp в зависимости от разрешения
                format_string = self._get_format_string(resolution)
                
                # Добавляем специфичные настройки для разных платформ
                extra_options = self._get_extra_options(source_type)
                
                # Подготавливаем команду
                output_template = os.path.join(output_dir, filename_template)
                cmd = [
                    "yt-dlp",
                    "--format", format_string,
                    "--write-info-json",
                    "--max-filesize", str(settings.YTDLP_MAX_FILESIZE),
                    "-o", output_template,
                    "--print", "%(title)s",
                    "--print", "%(duration)s",
                    "--print", "%(filename)s",
                ]
                
                # Добавляем дополнительные опции для конкретных платформ
                cmd.extend(extra_options)
                
                # Добавляем URL в конце
                cmd.append(url)
                
                # Запускаем процесс скачивания
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    text=True
                )
                
                stdout, stderr = await process.communicate()
                
                if process.returncode != 0:
                    logger.error(f"yt-dlp error for URL {url}: {stderr}")
                    return DownloadResult(
                        success=False,
                        error=f"Ошибка скачивания: {stderr}"
                    )
                
                # Разбираем вывод
                output_lines = stdout.strip().split("\n")
                if len(output_lines) >= 3:
                    title = output_lines[0]
                    try:
                        duration = int(float(output_lines[1]))
                    except (ValueError, TypeError):
                        duration = 0
                    
                    filename = output_lines[2]
                    file_size = 0
                    
                    if os.path.exists(filename):
                        file_size = os.path.getsize(filename)
                    
                    return DownloadResult(
                        success=True,
                        file_path=filename,
                        title=title,
                        file_size=file_size,
                        duration=duration
                    )
                else:
                    return DownloadResult(
                        success=False,
                        error="Неожиданный формат вывода yt-dlp"
                    )
                
        except Exception as e:
            logger.exception(f"Error downloading video from {url}: {str(e)}")
            return DownloadResult(
                success=False,
                error=f"Ошибка скачивания: {str(e)}"
            )
        finally:
            # Удаляем временный файл
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def determine_source_type(self, url: str) -> str:
        """
        Определяет тип источника видео по URL
        
        Args:
            url: URL видео
            
        Returns:
            Строка с типом источника (youtube, tiktok, vk, instagram, other)
        """
        if re.search(r'(youtube\.com|youtu\.be)', url):
            return "youtube"
        elif re.search(r'(tiktok\.com|vm\.tiktok\.com)', url):
            return "tiktok"
        elif re.search(r'(vk\.com|m\.vk\.com)', url):
            return "vk"
        elif re.search(r'(instagram\.com|www\.instagram\.com)', url):
            return "instagram"
        else:
            return "other"
    
    def _get_extra_options(self, source_type: str) -> List[str]:
        """
        Возвращает дополнительные опции для yt-dlp в зависимости от типа источника
        
        Args:
            source_type: Тип источника видео
            
        Returns:
            Список дополнительных опций для yt-dlp
        """
        if source_type == "tiktok":
            return ["--cookies-from-browser", "chrome"]  # Используем куки браузера для TikTok
        elif source_type == "vk":
            return ["--no-check-certificate"]  # Для VK иногда требуется отключить проверку сертификата
        elif source_type == "instagram":
            return ["--cookies-from-browser", "chrome", "--no-check-certificate"]  # Для Instagram нужны куки
        else:
            return []
    
    def _get_format_string(self, resolution: str) -> str:
        """
        Получает строку формата для yt-dlp на основе указанного разрешения
        """
        resolution_map = {
            "360p": "bestvideo[height<=360]+bestaudio/best[height<=360]/best",
            "480p": "bestvideo[height<=480]+bestaudio/best[height<=480]/best",
            "720p": "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
            "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
            "1440p": "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best",
            "2160p": "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best",
            "audio_only": "bestaudio/best"
        }
        
        return resolution_map.get(resolution, "best")
    
    async def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Получает информацию о видео без скачивания
        
        Args:
            url: URL видео
            
        Returns:
            Словарь с информацией о видео
        """
        try:
            # Определяем тип источника
            source_type = self.determine_source_type(url)
            
            # Получаем дополнительные опции для платформы
            extra_options = self._get_extra_options(source_type)
            
            cmd = [
                "yt-dlp",
                "--skip-download",
                "--dump-json",
            ]
            
            # Добавляем дополнительные опции для конкретных платформ
            cmd.extend(extra_options)
            
            # Добавляем URL в конце
            cmd.append(url)
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"yt-dlp info error for URL {url}: {stderr}")
                return {"error": stderr}
            
            import json
            info = json.loads(stdout)
            
            # Трансформируем формат в более удобный
            formats = []
            if "formats" in info:
                formats = self._transform_formats(info["formats"])
            
            return {
                "title": info.get("title", ""),
                "description": info.get("description", ""),
                "thumbnail": info.get("thumbnail", ""),
                "duration": info.get("duration", 0),
                "formats": formats,
                "extractor": info.get("extractor", ""),
                "extractor_key": info.get("extractor_key", ""),
                "source_type": source_type
            }
            
        except Exception as e:
            logger.exception(f"Error getting video info from {url}: {str(e)}")
            return {"error": str(e)}
    
    def _transform_formats(self, formats: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Преобразует форматы видео в более удобную структуру
        """
        result = []
        
        for fmt in formats:
            if not fmt.get("resolution") and fmt.get("height"):
                fmt["resolution"] = f"{fmt.get('height', '')}p"
                
            result.append({
                "format_id": fmt.get("format_id", ""),
                "ext": fmt.get("ext", ""),
                "resolution": fmt.get("resolution", ""),
                "filesize": fmt.get("filesize", 0),
                "vcodec": fmt.get("vcodec", ""),
                "acodec": fmt.get("acodec", ""),
                "fps": fmt.get("fps", 0),
            })
        
        return result
    
    async def convert_video(
        self, input_path: str, output_format: str, output_dir: str
    ) -> DownloadResult:
        """
        Конвертирует видео в указанный формат
        
        Args:
            input_path: Путь к исходному видео
            output_format: Формат для конвертации (mp4, mp3, avi, и т.д.)
            output_dir: Директория для сохранения результата
            
        Returns:
            DownloadResult с результатами конвертации
        """
        try:
            if not os.path.exists(input_path):
                return DownloadResult(
                    success=False,
                    error=f"Файл не найден: {input_path}"
                )
            
            # Формируем имя выходного файла
            filename = os.path.basename(input_path)
            filename_without_ext = os.path.splitext(filename)[0]
            output_filename = f"{filename_without_ext}.{output_format}"
            output_path = os.path.join(output_dir, output_filename)
            
            # Подготавливаем команду ffmpeg
            cmd = [
                "ffmpeg",
                "-i", input_path,
                "-y",  # Перезаписывать существующие файлы
            ]
            
            # Добавляем специфичные настройки для разных форматов
            if output_format == "mp3":
                cmd.extend([
                    "-vn",  # Убираем видео
                    "-acodec", "libmp3lame",
                    "-ab", "192k",  # Битрейт
                ])
            elif output_format in ["mp4", "avi", "mkv"]:
                cmd.extend([
                    "-c:v", "libx264",  # Видео кодек
                    "-c:a", "aac",  # Аудио кодек
                    "-b:a", "192k",  # Аудио битрейт
                ])
            
            # Добавляем путь к выходному файлу
            cmd.append(output_path)
            
            # Запускаем процесс конвертации
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"FFmpeg error: {stderr}")
                return DownloadResult(
                    success=False,
                    error=f"Ошибка конвертации: {stderr}"
                )
            
            # Получаем размер файла
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            
            return DownloadResult(
                success=True,
                file_path=output_path,
                title=filename_without_ext,
                file_size=file_size
            )
            
        except Exception as e:
            logger.exception(f"Error converting video {input_path}: {str(e)}")
            return DownloadResult(
                success=False,
                error=f"Ошибка конвертации: {str(e)}"
            )
    
    async def download_instagram_with_instaloader(self, url: str, output_dir: str) -> DownloadResult:
        """
        Скачивает видео или фото из Instagram с использованием instaloader
        
        Args:
            url: URL поста Instagram
            output_dir: Директория для сохранения
            
        Returns:
            DownloadResult с результатами скачивания
        """
        try:
            # Извлекаем идентификатор поста из URL
            match = re.search(r'instagram\.com/p/([^/]+)', url)
            if not match:
                return DownloadResult(
                    success=False,
                    error="Неверная ссылка на пост Instagram"
                )
            
            post_id = match.group(1)
            
            # Создаем временную директорию для скачивания
            temp_dir = tempfile.mkdtemp()
            
            # Подготавливаем команду для instaloader
            cmd = [
                "instaloader",
                "--login", settings.INSTAGRAM_USERNAME,
                "--password", settings.INSTAGRAM_PASSWORD,
                "--dirname-pattern", temp_dir,
                "--filename-pattern", post_id,
                "--no-metadata-json",
                "--no-captions",
                f"-- -{post_id}"
            ]
            
            # Запускаем процесс скачивания
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Instaloader error: {stderr}")
                return DownloadResult(
                    success=False,
                    error=f"Ошибка скачивания из Instagram: {stderr}"
                )
            
            # Ищем скачанный файл
            downloaded_files = os.listdir(temp_dir)
            video_files = [f for f in downloaded_files if f.endswith(('.mp4', '.mov'))]
            
            if video_files:
                # Нашли видео файл
                video_path = os.path.join(temp_dir, video_files[0])
                final_path = os.path.join(output_dir, video_files[0])
                
                # Копируем файл в указанную директорию
                import shutil
                shutil.copy2(video_path, final_path)
                
                # Получаем размер файла
                file_size = os.path.getsize(final_path)
                
                return DownloadResult(
                    success=True,
                    file_path=final_path,
                    title=f"Instagram_{post_id}",
                    file_size=file_size
                )
            else:
                # Возможно, это фото
                photo_files = [f for f in downloaded_files if f.endswith(('.jpg', '.jpeg', '.png'))]
                if photo_files:
                    photo_path = os.path.join(temp_dir, photo_files[0])
                    final_path = os.path.join(output_dir, photo_files[0])
                    
                    # Копируем файл в указанную директорию
                    import shutil
                    shutil.copy2(photo_path, final_path)
                    
                    # Получаем размер файла
                    file_size = os.path.getsize(final_path)
                    
                    return DownloadResult(
                        success=True,
                        file_path=final_path,
                        title=f"Instagram_{post_id}",
                        file_size=file_size
                    )
                
                return DownloadResult(
                    success=False,
                    error="Не удалось найти скачанный файл"
                )
            
        except Exception as e:
            logger.exception(f"Error downloading from Instagram {url}: {str(e)}")
            return DownloadResult(
                success=False,
                error=f"Ошибка скачивания из Instagram: {str(e)}"
            )
        finally:
            # Удаляем временную директорию
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)