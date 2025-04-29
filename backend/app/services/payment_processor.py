import uuid
import logging
import httpx
from typing import Optional, Dict, Any, Union
import json
from datetime import datetime

from app.core.config import settings
from app.models.payment import PaymentStatus, PaymentMethod

logger = logging.getLogger(__name__)

class PaymentProcessor:
    """
    Класс для обработки платежей через различные платежные системы.
    """
    
    def __init__(self):
        self.payment_provider = settings.PAYMENT_PROVIDER
        self.api_key = settings.PAYMENT_API_KEY
        self.api_secret = settings.PAYMENT_API_SECRET
        self.is_test_mode = settings.PAYMENT_TEST_MODE
        
        # Базовые URL для API платежных систем
        self.api_urls = {
            "yookassa": "https://api.yookassa.ru/v3",
            "stripe": "https://api.stripe.com/v1",
        }
    
    async def create_payment(
        self,
        payment_id: int,
        amount: float,
        currency: str,
        description: str,
        payment_method: str,
        return_url: str
    ) -> str:
        """
        Создает платеж в платежной системе.
        
        Args:
            payment_id: ID платежа в нашей системе
            amount: Сумма платежа
            currency: Валюта платежа
            description: Описание платежа
            payment_method: Метод оплаты
            return_url: URL для возврата после оплаты
            
        Returns:
            URL для перехода на страницу оплаты
        """
        if self.payment_provider == "yookassa":
            return await self._create_yookassa_payment(
                payment_id, amount, currency, description, payment_method, return_url
            )
        elif self.payment_provider == "stripe":
            return await self._create_stripe_payment(
                payment_id, amount, currency, description, payment_method, return_url
            )
        else:
            # Для примера возвращаем тестовый URL
            logger.warning("Используется тестовый процессор платежей!")
            return f"https://example.com/pay/test-{payment_id}"
    
    async def check_payment_status(self, external_payment_id: str) -> PaymentStatus:
        """
        Проверяет статус платежа в платежной системе.
        
        Args:
            external_payment_id: ID платежа в платежной системе
            
        Returns:
            Статус платежа
        """
        if self.payment_provider == "yookassa":
            return await self._check_yookassa_payment_status(external_payment_id)
        elif self.payment_provider == "stripe":
            return await self._check_stripe_payment_status(external_payment_id)
        else:
            # Тестовый режим - всегда успешно
            logger.warning("Используется тестовый процессор платежей!")
            return PaymentStatus.COMPLETED
    
    async def cancel_payment(self, external_payment_id: str) -> bool:
        """
        Отменяет платеж в платежной системе.
        
        Args:
            external_payment_id: ID платежа в платежной системе
            
        Returns:
            True, если отмена успешна
        """
        if self.payment_provider == "yookassa":
            return await self._cancel_yookassa_payment(external_payment_id)
        elif self.payment_provider == "stripe":
            return await self._cancel_stripe_payment(external_payment_id)
        else:
            # Тестовый режим - всегда успешно
            logger.warning("Используется тестовый процессор платежей!")
            return True
    
    async def _create_yookassa_payment(
        self,
        payment_id: int,
        amount: float,
        currency: str,
        description: str,
        payment_method: str,
        return_url: str
    ) -> str:
        """
        Создает платеж в YooKassa.
        """
        api_url = f"{self.api_urls['yookassa']}/payments"
        
        # Преобразуем метод оплаты в формат YooKassa
        yookassa_method = self._map_payment_method_to_yookassa(payment_method)
        
        # Создаем данные для запроса
        payment_data = {
            "amount": {
                "value": str(amount),
                "currency": currency
            },
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "capture": True,
            "description": description,
            "metadata": {
                "payment_id": payment_id
            }
        }
        
        # Если указан конкретный метод оплаты
        if yookassa_method:
            payment_data["payment_method_data"] = {
                "type": yookassa_method
            }
        
        try:
            # Отправляем запрос к YooKassa API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    api_url,
                    json=payment_data,
                    auth=(self.api_key, self.api_secret),
                    headers={"Idempotence-Key": str(uuid.uuid4())}
                )
                
                if response.status_code != 200:
                    logger.error(f"Ошибка YooKassa API: {response.text}")
                    raise Exception(f"Ошибка API YooKassa: {response.status_code}")
                
                result = response.json()
                
                # Возвращаем URL для оплаты
                return result["confirmation"]["confirmation_url"]
                
        except Exception as e:
            logger.exception(f"Ошибка при создании платежа в YooKassa: {str(e)}")
            raise
    
    async def _check_yookassa_payment_status(self, external_payment_id: str) -> PaymentStatus:
        """
        Проверяет статус платежа в YooKassa.
        """
        api_url = f"{self.api_urls['yookassa']}/payments/{external_payment_id}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    api_url,
                    auth=(self.api_key, self.api_secret)
                )
                
                if response.status_code != 200:
                    logger.error(f"Ошибка YooKassa API: {response.text}")
                    raise Exception(f"Ошибка API YooKassa: {response.status_code}")
                
                result = response.json()
                
                # Конвертируем статус YooKassa в наш формат
                yookassa_status = result.get("status")
                
                if yookassa_status == "succeeded":
                    return PaymentStatus.COMPLETED
                elif yookassa_status == "canceled":
                    return PaymentStatus.FAILED
                elif yookassa_status == "pending":
                    return PaymentStatus.PENDING
                elif yookassa_status == "waiting_for_capture":
                    return PaymentStatus.PENDING
                else:
                    return PaymentStatus.PENDING
                
        except Exception as e:
            logger.exception(f"Ошибка при проверке статуса платежа в YooKassa: {str(e)}")
            raise
    
    async def _cancel_yookassa_payment(self, external_payment_id: str) -> bool:
        """
        Отменяет платеж в YooKassa.
        """
        api_url = f"{self.api_urls['yookassa']}/payments/{external_payment_id}/cancel"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    api_url,
                    auth=(self.api_key, self.api_secret),
                    headers={"Idempotence-Key": str(uuid.uuid4())}
                )
                
                if response.status_code != 200:
                    logger.error(f"Ошибка YooKassa API: {response.text}")
                    raise Exception(f"Ошибка API YooKassa: {response.status_code}")
                
                return True
                
        except Exception as e:
            logger.exception(f"Ошибка при отмене платежа в YooKassa: {str(e)}")
            raise
    
    async def _create_stripe_payment(
        self,
        payment_id: int,
        amount: float,
        currency: str,
        description: str,
        payment_method: str,
        return_url: str
    ) -> str:
        """
        Создает платеж в Stripe.
        """
        import stripe
        stripe.api_key = self.api_key
        
        try:
            # Создаем сессию для оплаты
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": currency.lower(),
                            "product_data": {
                                "name": description,
                            },
                            "unit_amount": int(amount * 100),  # Stripe использует центы
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=f"{return_url}?success=true&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{return_url}?canceled=true",
                metadata={
                    "payment_id": payment_id
                }
            )
            
            return session.url
            
        except Exception as e:
            logger.exception(f"Ошибка при создании платежа в Stripe: {str(e)}")
            raise
    
    async def _check_stripe_payment_status(self, external_payment_id: str) -> PaymentStatus:
        """
        Проверяет статус платежа в Stripe.
        """
        import stripe
        stripe.api_key = self.api_key
        
        try:
            # Получаем информацию о сессии оплаты
            session = stripe.checkout.Session.retrieve(external_payment_id)
            
            # Конвертируем статус Stripe в наш формат
            if session.payment_status == "paid":
                return PaymentStatus.COMPLETED
            elif session.status == "complete":
                return PaymentStatus.COMPLETED
            elif session.status == "expired":
                return PaymentStatus.FAILED
            else:
                return PaymentStatus.PENDING
                
        except Exception as e:
            logger.exception(f"Ошибка при проверке статуса платежа в Stripe: {str(e)}")
            raise
    
    async def _cancel_stripe_payment(self, external_payment_id: str) -> bool:
        """
        Отменяет платеж в Stripe.
        В Stripe нельзя напрямую отменить Checkout Session,
        но можно отменить связанный с ней платеж (Payment Intent).
        """
        import stripe
        stripe.api_key = self.api_key
        
        try:
            # Получаем информацию о сессии
            session = stripe.checkout.Session.retrieve(external_payment_id)
            
            # Если есть Payment Intent, отменяем его
            if hasattr(session, "payment_intent") and session.payment_intent:
                stripe.PaymentIntent.cancel(session.payment_intent)
                return True
            
            return False
                
        except Exception as e:
            logger.exception(f"Ошибка при отмене платежа в Stripe: {str(e)}")
            raise
    
    def _map_payment_method_to_yookassa(self, payment_method: str) -> Optional[str]:
        """
        Преобразует внутренний метод оплаты в формат YooKassa.
        """
        mapping = {
            PaymentMethod.CARD.value: "bank_card",
            PaymentMethod.YOOMONEY.value: "yoo_money",
            PaymentMethod.QIWI.value: "qiwi",
            PaymentMethod.WEBMONEY.value: None,  # YooKassa не поддерживает напрямую
            PaymentMethod.SBP.value: "sbp",
        }
        
        return mapping.get(payment_method) 