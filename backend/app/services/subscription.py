from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.subscription import Subscription, SubscriptionType, SubscriptionStatus
from app.models.user import User
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate
from app.services.payment import PaymentService


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.payment_service = PaymentService(db)
        
    def get_subscription_by_id(self, subscription_id: int) -> Subscription:
        """Получение подписки по ID"""
        subscription = self.db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Подписка не найдена"
            )
        return subscription
    
    def get_active_subscription_by_user_id(self, user_id: int) -> Subscription:
        """Получение активной подписки пользователя"""
        subscription = (
            self.db.query(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.end_date > datetime.utcnow()
            )
            .first()
        )
        return subscription
    
    def create_subscription(self, user_id: int, subscription_data: SubscriptionCreate) -> Subscription:
        """Создание новой подписки"""
        # Проверяем, что у пользователя нет активной подписки
        active_subscription = self.get_active_subscription_by_user_id(user_id)
        if active_subscription:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У пользователя уже есть активная подписка"
            )
        
        # Определяем период подписки (30 дней для всех типов)
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=30)
        
        # Создаем платеж через сервис платежей
        payment_amount = self._get_subscription_price(subscription_data.type)
        payment = self.payment_service.create_payment(
            user_id=user_id,
            amount=payment_amount,
            payment_method=subscription_data.payment_method,
            description=f"Подписка {subscription_data.type.value}"
        )
        
        # Создаем подписку
        subscription = Subscription(
            user_id=user_id,
            type=subscription_data.type,
            status=SubscriptionStatus.PENDING,  # Изначально в ожидании оплаты
            start_date=start_date,
            end_date=end_date,
            auto_renewal=subscription_data.auto_renewal
        )
        
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    def update_subscription(self, subscription_id: int, subscription_data: SubscriptionUpdate) -> Subscription:
        """Обновление параметров подписки"""
        subscription = self.get_subscription_by_id(subscription_id)
        
        if subscription_data.auto_renewal is not None:
            subscription.auto_renewal = subscription_data.auto_renewal
            
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
    
    def cancel_subscription(self, subscription_id: int, reason: str = None) -> Subscription:
        """Отмена подписки"""
        subscription = self.get_subscription_by_id(subscription_id)
        
        if subscription.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Только активную подписку можно отменить"
            )
        
        subscription.status = SubscriptionStatus.CANCELED
        subscription.auto_renewal = False
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
    
    def process_payment_success(self, subscription_id: int) -> Subscription:
        """Обработка успешной оплаты"""
        subscription = self.get_subscription_by_id(subscription_id)
        
        if subscription.status != SubscriptionStatus.PENDING:
            return subscription
        
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
    
    def process_payment_failure(self, subscription_id: int) -> Subscription:
        """Обработка неудачной оплаты"""
        subscription = self.get_subscription_by_id(subscription_id)
        
        if subscription.status != SubscriptionStatus.PENDING:
            return subscription
        
        subscription.status = SubscriptionStatus.CANCELED
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
    
    def renew_subscription(self, subscription_id: int) -> Subscription:
        """Продление подписки"""
        subscription = self.get_subscription_by_id(subscription_id)
        
        if not subscription.auto_renewal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Автопродление отключено для данной подписки"
            )
        
        # Продлеваем период подписки на 30 дней
        subscription.start_date = subscription.end_date
        subscription.end_date = subscription.end_date + timedelta(days=30)
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        return subscription
    
    def check_expired_subscriptions(self):
        """Проверка и обновление статуса истекших подписок"""
        now = datetime.utcnow()
        expired_subscriptions = (
            self.db.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.end_date < now
            )
            .all()
        )
        
        for subscription in expired_subscriptions:
            if subscription.auto_renewal:
                # Если включено автопродление, пытаемся продлить
                try:
                    self.renew_subscription(subscription.id)
                except Exception:
                    subscription.status = SubscriptionStatus.EXPIRED
            else:
                subscription.status = SubscriptionStatus.EXPIRED
                
            subscription.updated_at = now
        
        if expired_subscriptions:
            self.db.commit()
    
    def _get_subscription_price(self, subscription_type: SubscriptionType) -> float:
        """Получение цены подписки по типу"""
        prices = {
            SubscriptionType.BASIC: 199.0,
            SubscriptionType.PREMIUM: 499.0,
            SubscriptionType.UNLIMITED: 999.0
        }
        return prices.get(subscription_type, 0.0)
    
    def can_download_video(self, user_id: int) -> bool:
        """Проверка, может ли пользователь скачивать видео"""
        # Получаем пользователя
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
            
        # Проверяем активную подписку
        subscription = self.get_active_subscription_by_user_id(user_id)
        if not subscription:
            # Без подписки можно скачать только 3 видео
            return user.downloads_count < 3
            
        # С подпиской UNLIMITED - без ограничений
        if subscription.type == SubscriptionType.UNLIMITED:
            return True
            
        # Для BASIC - до 10 видео в месяц
        if subscription.type == SubscriptionType.BASIC:
            return user.downloads_count < 10
            
        # Для PREMIUM - до 50 видео в месяц
        if subscription.type == SubscriptionType.PREMIUM:
            return user.downloads_count < 50
            
        return False 
    
    def create_manual_subscription(self, admin_user_id: int, user_id: int, subscription_type: SubscriptionType, duration_days: int = 30) -> Subscription:
        """
        Назначение подписки пользователю администратором
        
        Args:
            admin_user_id: ID администратора, выполняющего действие
            user_id: ID пользователя, которому назначается подписка
            subscription_type: Тип подписки (BASIC, PREMIUM, UNLIMITED)
            duration_days: Продолжительность подписки в днях (по умолчанию 30)
        
        Returns:
            Subscription: Созданная подписка
        """
        # Проверяем, что пользователь-администратор имеет права
        admin = self.db.query(User).filter(User.id == admin_user_id).first()
        if not admin or not admin.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администратор может назначать подписки"
            )
        
        # Проверяем существование целевого пользователя
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Отменяем текущую активную подписку, если она есть
        active_subscription = self.get_active_subscription_by_user_id(user_id)
        if active_subscription:
            active_subscription.status = SubscriptionStatus.CANCELED
            active_subscription.updated_at = datetime.utcnow()
        
        # Создаем новую подписку
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=duration_days)
        
        subscription = Subscription(
            user_id=user_id,
            type=subscription_type,
            status=SubscriptionStatus.ACTIVE,  # Сразу активна, без ожидания оплаты
            start_date=start_date,
            end_date=end_date,
            auto_renewal=False  # Ручное продление по умолчанию
        )
        
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription 