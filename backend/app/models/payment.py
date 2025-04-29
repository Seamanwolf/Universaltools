from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from app.db.base_class import Base


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CARD = "card"
    YOOMONEY = "yoomoney"
    QIWI = "qiwi"
    WEBMONEY = "webmoney"
    SBP = "sbp"


class PaymentHistory(Base):
    __tablename__ = "payment_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="RUB")
    status = Column(String(20), nullable=False, default=PaymentStatus.PENDING)
    payment_method = Column(String(20), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    external_payment_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="payment_history")
    subscription = relationship("Subscription", back_populates="payment_history")


class Payment(Base):
    """Модель платежа."""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="RUB")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.CARD)
    provider_payment_id = Column(String(255), nullable=True)  # ID платежа в платежной системе
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Внешний ключ для связи с пользователем
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Обратная связь с пользователем
    user = relationship("User", back_populates="payments") 