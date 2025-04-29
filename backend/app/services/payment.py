import logging
import secrets
import json
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import aiohttp
import uuid

import stripe
from yookassa import Configuration, Payment as YooKassaPayment
from yookassa.domain.notification import WebhookNotification

from app.models.payment import PaymentMethod, PaymentStatus
from app.core.config import settings
from app.utils.database import AsyncSessionLocal
from sqlalchemy.future import select
from app.models import Payment, Subscription
from app.models.subscription import SubscriptionType

logger = logging.getLogger(__name__)

# Инициализация Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Инициализация ЮKassa
if settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY:
    Configuration.account_id = settings.YOOKASSA_SHOP_ID
    Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

class PaymentProcessor(ABC):
    """Абстрактный класс для обработки платежей"""
    
    @abstractmethod
    async def process_payment(
        self, 
        payment_id: int, 
        amount: float, 
        description: str,
        user_id: int,
        subscription_id: int
    ) -> Dict[str, Any]:
        """Обрабатывает платеж и возвращает результат"""
        pass
    
    @abstractmethod
    async def check_payment(self, payment_id: int) -> Dict[str, Any]:
        """Проверяет статус платежа"""
        pass
    
    async def update_payment_status(
        self, payment_id: int, status: PaymentStatus, transaction_id: Optional[str] = None
    ) -> None:
        """Обновляет статус платежа в БД"""
        async with AsyncSessionLocal() as db:
            query = select(Payment).where(Payment.id == payment_id)
            result = await db.execute(query)
            payment = result.scalar_one_or_none()
            
            if not payment:
                logger.error(f"Payment ID {payment_id} not found")
                return
            
            payment.status = status
            if transaction_id:
                payment.transaction_id = transaction_id
                
            db.add(payment)
            
            # Если платеж успешный, активируем подписку
            if status == PaymentStatus.COMPLETED:
                query = select(Subscription).where(Subscription.id == payment.subscription_id)
                result = await db.execute(query)
                subscription = result.scalar_one_or_none()
                
                if subscription:
                    subscription.is_active = 1
                    subscription.payment_id = payment.transaction_id or str(payment.id)
                    db.add(subscription)
            
            await db.commit()


class UKassaCardProcessor(PaymentProcessor):
    """Процессор платежей для Юкасса (карты)"""
    
    async def process_payment(
        self, 
        payment_id: int, 
        amount: float, 
        description: str,
        user_id: int,
        subscription_id: int
    ) -> Dict[str, Any]:
        """Создает платеж в Юкасса"""
        try:
            # В реальном проекте здесь был бы API-запрос к Юкасса
            # Имитируем создание платежа
            idempotence_key = secrets.token_hex(16)
            
            # Эмуляция запроса к API Юкасса
            payment_data = {
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "payment_method_data": {
                    "type": "bank_card"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": f"{settings.FRONTEND_URL}/payment/success"
                },
                "description": description
            }
            
            # Эмуляция ответа API
            transaction_id = f"ukassa_{secrets.token_hex(8)}"
            payment_url = f"https://example.com/payment/{transaction_id}"
            
            # Сохраняем данные транзакции
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.PENDING,
                transaction_id=transaction_id
            )
            
            # Добавляем дополнительные данные (в реальном проекте сохранять в БД)
            payment_data = {
                "transaction_id": transaction_id,
                "payment_url": payment_url,
                "status": "pending"
            }
            
            # В реальном проекте здесь обновляли бы поле payment_data в Payment
            
            return {
                "success": True,
                "payment_url": payment_url,
                "transaction_id": transaction_id
            }
            
        except Exception as e:
            logger.exception(f"Error processing UKassa card payment: {str(e)}")
            
            # Обновляем статус платежа на неуспешный
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.FAILED
            )
            
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_payment(self, payment_id: int) -> Dict[str, Any]:
        """Проверяет статус платежа в Юкасса"""
        try:
            # В реальном проекте здесь был бы API-запрос к Юкасса
            # для проверки статуса платежа
            
            # Эмуляция успешного платежа (в реальности получали бы статус из API)
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.COMPLETED
            )
            
            return {
                "success": True,
                "status": "completed"
            }
            
        except Exception as e:
            logger.exception(f"Error checking UKassa payment: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


class UKassaQRProcessor(PaymentProcessor):
    """Процессор платежей для Юкасса (QR-код)"""
    
    async def process_payment(
        self, 
        payment_id: int, 
        amount: float, 
        description: str,
        user_id: int,
        subscription_id: int
    ) -> Dict[str, Any]:
        """Создает QR-платеж в Юкасса"""
        try:
            # В реальном проекте здесь был бы API-запрос к Юкасса
            # Имитируем создание платежа
            idempotence_key = secrets.token_hex(16)
            
            # Эмуляция запроса к API Юкасса
            payment_data = {
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "payment_method_data": {
                    "type": "qr"
                },
                "confirmation": {
                    "type": "qr",
                    "return_url": f"{settings.FRONTEND_URL}/payment/success"
                },
                "description": description
            }
            
            # Эмуляция ответа API
            transaction_id = f"ukassa_qr_{secrets.token_hex(8)}"
            payment_url = f"https://example.com/qr/{transaction_id}"
            
            # Сохраняем данные транзакции
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.PENDING,
                transaction_id=transaction_id
            )
            
            return {
                "success": True,
                "payment_url": payment_url,
                "transaction_id": transaction_id
            }
            
        except Exception as e:
            logger.exception(f"Error processing UKassa QR payment: {str(e)}")
            
            # Обновляем статус платежа на неуспешный
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.FAILED
            )
            
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_payment(self, payment_id: int) -> Dict[str, Any]:
        """Проверяет статус QR-платежа в Юкасса"""
        try:
            # В реальном проекте здесь был бы API-запрос к Юкасса
            # для проверки статуса платежа
            
            # Эмуляция успешного платежа (в реальности получали бы статус из API)
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.COMPLETED
            )
            
            return {
                "success": True,
                "status": "completed"
            }
            
        except Exception as e:
            logger.exception(f"Error checking UKassa QR payment: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


class AdminManualProcessor(PaymentProcessor):
    """Процессор для ручных платежей, создаваемых администратором"""
    
    async def process_payment(
        self, 
        payment_id: int, 
        amount: float, 
        description: str,
        user_id: int,
        subscription_id: int
    ) -> Dict[str, Any]:
        """Обрабатывает ручной платеж от администратора"""
        try:
            # Для ручных платежей сразу устанавливаем статус COMPLETED
            transaction_id = f"manual_{datetime.now().strftime('%Y%m%d%H%M%S')}_{payment_id}"
            
            # Сохраняем данные транзакции
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.COMPLETED,
                transaction_id=transaction_id
            )
            
            return {
                "success": True,
                "status": "completed",
                "transaction_id": transaction_id
            }
            
        except Exception as e:
            logger.exception(f"Error processing manual payment: {str(e)}")
            
            # Обновляем статус платежа на неуспешный
            await self.update_payment_status(
                payment_id=payment_id,
                status=PaymentStatus.FAILED
            )
            
            return {
                "success": False,
                "error": str(e)
            }
    
    async def check_payment(self, payment_id: int) -> Dict[str, Any]:
        """Проверяет статус ручного платежа (всегда успешный)"""
        return {
            "success": True,
            "status": "completed"
        }


def get_payment_processor(payment_method: str) -> PaymentProcessor:
    """
    Фабричный метод для получения нужного процессора платежей
    """
    processors = {
        PaymentMethod.UKASSA_CARD.value: UKassaCardProcessor(),
        PaymentMethod.UKASSA_QR.value: UKassaQRProcessor(),
        PaymentMethod.ADMIN_MANUAL.value: AdminManualProcessor()
    }
    
    return processors.get(payment_method, UKassaCardProcessor())


class PaymentService:
    """Сервис для обработки платежей"""
    
    def get_subscription_price(self, subscription_type: SubscriptionType) -> float:
        """
        Возвращает цену подписки определенного типа
        
        Args:
            subscription_type: Тип подписки
            
        Returns:
            Цена подписки в рублях
        """
        prices = {
            SubscriptionType.ONE_TIME: 100.0,    # 100 руб за разовое скачивание
            SubscriptionType.PACK_10: 800.0,     # 800 руб за 10 скачиваний (скидка 20%)
            SubscriptionType.MONTHLY: 1000.0,    # 1000 руб за месяц
            SubscriptionType.YEARLY: 10000.0,    # 10000 руб за год (скидка ~17%)
            SubscriptionType.TRIAL: 0.0          # Пробная подписка бесплатная
        }
        
        return prices.get(subscription_type, 0.0)
    
    def get_subscription_expiry(self, subscription_type: SubscriptionType) -> Optional[datetime]:
        """
        Возвращает дату истечения подписки определенного типа
        
        Args:
            subscription_type: Тип подписки
            
        Returns:
            Дата истечения или None для подписок с ограниченным числом скачиваний
        """
        now = datetime.utcnow()
        
        if subscription_type == SubscriptionType.MONTHLY:
            return now + timedelta(days=30)
        elif subscription_type == SubscriptionType.YEARLY:
            return now + timedelta(days=365)
        
        # Для ONE_TIME, PACK_10 и TRIAL не устанавливаем дату истечения
        return None
    
    def get_subscription_downloads_limit(self, subscription_type: SubscriptionType) -> Optional[int]:
        """
        Возвращает лимит скачиваний для подписки определенного типа
        
        Args:
            subscription_type: Тип подписки
            
        Returns:
            Лимит скачиваний или None для безлимитных подписок
        """
        limits = {
            SubscriptionType.ONE_TIME: 1,
            SubscriptionType.PACK_10: 10,
            SubscriptionType.TRIAL: settings.TRIAL_DOWNLOADS_LIMIT
        }
        
        return limits.get(subscription_type)
    
    async def create_stripe_payment(
        self, amount: float, user_id: int, subscription_id: int, metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Создает платежную сессию Stripe
        
        Args:
            amount: Сумма платежа в рублях
            user_id: ID пользователя
            subscription_id: ID подписки
            metadata: Дополнительные метаданные
            
        Returns:
            Словарь с данными платежной сессии
        """
        try:
            # Конвертируем сумму в копейки для Stripe
            amount_cents = int(amount * 100)
            
            # Создаем метаданные
            payment_metadata = {
                "user_id": str(user_id),
                "subscription_id": str(subscription_id)
            }
            
            if metadata:
                payment_metadata.update(metadata)
            
            # Создаем платежную сессию
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": "rub",
                            "product_data": {
                                "name": "Подписка на сервис скачивания видео",
                            },
                            "unit_amount": amount_cents,
                        },
                        "quantity": 1,
                    },
                ],
                mode="payment",
                success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
                metadata=payment_metadata,
            )
            
            return {
                "payment_url": checkout_session.url,
                "session_id": checkout_session.id,
                "payment_method": PaymentMethod.STRIPE,
                "amount": amount,
                "payment_data": json.dumps({"id": checkout_session.id})
            }
        
        except Exception as e:
            logger.exception(f"Error creating Stripe payment: {str(e)}")
            raise
    
    async def verify_stripe_webhook(self, signature: str, payload: bytes) -> Dict[str, Any]:
        """
        Проверяет Stripe вебхук и возвращает данные события
        
        Args:
            signature: Подпись вебхука
            payload: Тело запроса в байтах
            
        Returns:
            Словарь с данными события
        """
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=settings.STRIPE_WEBHOOK_SECRET
            )
            
            if event.type == "checkout.session.completed":
                session = event.data.object
                metadata = session.get("metadata", {})
                user_id = metadata.get("user_id")
                subscription_id = metadata.get("subscription_id")
                
                return {
                    "success": True,
                    "payment_status": PaymentStatus.COMPLETED,
                    "user_id": int(user_id) if user_id else None,
                    "subscription_id": int(subscription_id) if subscription_id else None,
                    "transaction_id": session.id,
                    "amount": session.amount_total / 100,  # Конвертируем обратно в рубли
                }
            
            return {"success": False, "error": f"Неподдерживаемый тип события: {event.type}"}
            
        except Exception as e:
            logger.exception(f"Error verifying Stripe webhook: {str(e)}")
            return {"success": False, "error": str(e)}
            
    async def create_ukassa_payment(
        self, amount: float, user_id: int, subscription_id: int, 
        payment_method: str = "bank_card", metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Создает платеж в ЮKassa
        
        Args:
            amount: Сумма платежа в рублях
            user_id: ID пользователя
            subscription_id: ID подписки
            payment_method: Метод оплаты (bank_card, qr, и т.д.)
            metadata: Дополнительные метаданные
            
        Returns:
            Словарь с данными платежа
        """
        try:
            # Создаем метаданные
            payment_metadata = {
                "user_id": str(user_id),
                "subscription_id": str(subscription_id)
            }
            
            if metadata:
                payment_metadata.update(metadata)
            
            # Определяем метод платежа для UKassa
            ukassa_method = None
            payment_type = PaymentMethod.UKASSA_CARD
            
            if payment_method == "bank_card":
                ukassa_method = "bank_card"
                payment_type = PaymentMethod.UKASSA_CARD
            elif payment_method == "qr":
                ukassa_method = "qr"
                payment_type = PaymentMethod.UKASSA_QR
            
            # Создаем идентификатор платежа
            idempotence_key = str(uuid.uuid4())
            
            # Создаем платеж в ЮKassa
            payment = YooKassaPayment.create({
                "amount": {
                    "value": amount,
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": settings.UKASSA_RETURN_URL
                },
                "capture": True,
                "description": f"Подписка на сервис скачивания видео (ID: {subscription_id})",
                "metadata": payment_metadata,
                "payment_method_data": {
                    "type": ukassa_method
                }
            }, idempotence_key)
            
            # Проверяем успешное создание платежа
            if not payment or not payment.confirmation or not payment.confirmation.confirmation_url:
                raise ValueError("Не удалось создать платеж в ЮKassa")
            
            return {
                "payment_url": payment.confirmation.confirmation_url,
                "payment_id": payment.id,
                "payment_method": payment_type,
                "amount": amount,
                "payment_data": json.dumps({"id": payment.id, "status": payment.status})
            }
            
        except Exception as e:
            logger.exception(f"Error creating UKassa payment: {str(e)}")
            raise
    
    async def verify_ukassa_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Проверяет вебхук от ЮKassa и возвращает данные платежа
        
        Args:
            payload: Данные вебхука
            
        Returns:
            Словарь с данными платежа
        """
        try:
            # Создаем объект уведомления
            notification_object = WebhookNotification(payload)
            
            # Извлекаем данные платежа
            payment = notification_object.object
            
            if not payment:
                return {"success": False, "error": "Не удалось получить данные платежа"}
            
            # Проверяем статус платежа
            if payment.status == "succeeded":
                metadata = payment.metadata or {}
                user_id = metadata.get("user_id")
                subscription_id = metadata.get("subscription_id")
                
                return {
                    "success": True,
                    "payment_status": PaymentStatus.COMPLETED,
                    "user_id": int(user_id) if user_id else None,
                    "subscription_id": int(subscription_id) if subscription_id else None,
                    "transaction_id": payment.id,
                    "amount": float(payment.amount.value),
                }
            else:
                return {
                    "success": False,
                    "payment_status": PaymentStatus.FAILED,
                    "error": f"Неуспешный статус платежа: {payment.status}"
                }
                
        except Exception as e:
            logger.exception(f"Error verifying UKassa webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    async def check_ukassa_payment_status(self, payment_id: str) -> Dict[str, Any]:
        """
        Проверяет статус платежа в ЮKassa по его ID
        
        Args:
            payment_id: ID платежа в ЮKassa
            
        Returns:
            Словарь с данными о статусе платежа
        """
        try:
            # Получаем информацию о платеже
            payment = YooKassaPayment.find_one(payment_id)
            
            if not payment:
                return {"success": False, "error": "Платеж не найден"}
            
            # Проверяем статус платежа
            if payment.status == "succeeded":
                metadata = payment.metadata or {}
                user_id = metadata.get("user_id")
                subscription_id = metadata.get("subscription_id")
                
                return {
                    "success": True,
                    "payment_status": PaymentStatus.COMPLETED,
                    "user_id": int(user_id) if user_id else None,
                    "subscription_id": int(subscription_id) if subscription_id else None,
                    "transaction_id": payment.id,
                    "amount": float(payment.amount.value),
                }
            elif payment.status == "canceled":
                return {
                    "success": False,
                    "payment_status": PaymentStatus.FAILED,
                    "error": "Платеж был отменен"
                }
            else:
                return {
                    "success": False,
                    "payment_status": PaymentStatus.PENDING,
                    "message": f"Платеж в процессе, статус: {payment.status}"
                }
                
        except Exception as e:
            logger.exception(f"Error checking UKassa payment status: {str(e)}")
            return {"success": False, "error": str(e)} 