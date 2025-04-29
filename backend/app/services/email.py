import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from typing import List, Dict, Any, Optional
from pathlib import Path
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """Сервис для отправки электронных писем"""
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.templates_dir = Path(settings.TEMPLATES_DIR) / "emails"
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Отправляет электронное письмо с использованием шаблона
        
        Args:
            to_email: Email получателя
            subject: Тема письма
            template_name: Имя шаблона (без расширения)
            context: Контекст для шаблона
            cc: Список адресов для копии
            bcc: Список адресов для скрытой копии
            
        Returns:
            True если письмо отправлено успешно, иначе False
        """
        try:
            # Если отправка отключена, просто логируем
            if not settings.SMTP_ENABLED:
                logger.info(f"Email sending disabled: {to_email}, {subject}")
                logger.debug(f"Email context: {context}")
                return True
            
            # Загружаем шаблон
            template_path = self.templates_dir / f"{template_name}.html"
            if not os.path.exists(template_path):
                logger.error(f"Email template not found: {template_path}")
                return False
            
            with open(template_path, "r") as f:
                template_content = f.read()
            
            # Создаем шаблон Jinja2 и рендерим его
            template = Template(template_content)
            html_content = template.render(**context)
            
            # Создаем сообщение
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            if cc:
                message["Cc"] = ", ".join(cc)
            if bcc:
                message["Bcc"] = ", ".join(bcc)
            
            # Добавляем HTML-контент
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Отправляем сообщение
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                
                recipients = [to_email]
                if cc:
                    recipients.extend(cc)
                if bcc:
                    recipients.extend(bcc)
                
                server.sendmail(self.from_email, recipients, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
        
        except Exception as e:
            logger.exception(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_verification_email(self, user_email: str, verification_token: str) -> bool:
        """
        Отправляет письмо для верификации email
        
        Args:
            user_email: Email пользователя
            verification_token: Токен верификации
            
        Returns:
            True если письмо отправлено успешно, иначе False
        """
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
        context = {
            "verification_url": verification_url,
            "support_email": settings.SUPPORT_EMAIL,
            "site_name": settings.PROJECT_NAME,
        }
        
        return await self.send_email(
            to_email=user_email,
            subject="Подтверждение адреса электронной почты",
            template_name="email_verification",
            context=context
        )
    
    async def send_password_reset_email(self, user_email: str, reset_token: str) -> bool:
        """
        Отправляет письмо для сброса пароля
        
        Args:
            user_email: Email пользователя
            reset_token: Токен сброса пароля
            
        Returns:
            True если письмо отправлено успешно, иначе False
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        context = {
            "reset_url": reset_url,
            "support_email": settings.SUPPORT_EMAIL,
            "site_name": settings.PROJECT_NAME,
        }
        
        return await self.send_email(
            to_email=user_email,
            subject="Сброс пароля",
            template_name="password_reset",
            context=context
        )

# Создаем экземпляр сервиса
email_service = EmailService() 