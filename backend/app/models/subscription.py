from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Boolean, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.db.base_class import Base


class SubscriptionType(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    TRIAL = "trial"
    ONE_TIME = "one_time"
    PACK_10 = "pack_10"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"
    PAYMENT_FAILED = "payment_failed"
    PENDING = "pending"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(20), nullable=False, default=SubscriptionType.FREE)
    status = Column(String(20), nullable=False, default=SubscriptionStatus.ACTIVE)
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    auto_renewal = Column(Boolean, default=False)
    downloads_count = Column(Integer, default=0)
    payment_id = Column(String(255), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="subscriptions")
    payment_history = relationship("PaymentHistory", back_populates="subscription") 