from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.models.subscription import SubscriptionType, SubscriptionStatus

class SubscriptionTypeEnum(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    UNLIMITED = "unlimited"


class SubscriptionStatusEnum(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"


class SubscriptionBase(BaseModel):
    type: SubscriptionType = Field(..., description="Тип подписки")
    auto_renewal: bool = Field(False, description="Автопродление подписки")


class SubscriptionCreate(SubscriptionBase):
    payment_method: str


class SubscriptionResponse(SubscriptionBase):
    id: int
    user_id: int
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SubscriptionDetail(SubscriptionResponse):
    payment_id: Optional[str] = None
    
    class Config:
        orm_mode = True


class SubscriptionUpdate(BaseModel):
    type: Optional[SubscriptionType] = Field(None, description="Тип подписки")
    status: Optional[SubscriptionStatus] = Field(None, description="Статус подписки")
    auto_renewal: Optional[bool] = Field(None, description="Автопродление подписки")
    end_date: Optional[datetime] = Field(None, description="Дата окончания подписки")
    cancellation_reason: Optional[str] = Field(None, description="Причина отмены подписки")


class SubscriptionPlan(BaseModel):
    type: SubscriptionType
    name: str
    description: str
    price: float
    downloads_limit: Optional[int] = None
    duration_days: Optional[int] = None
    features: List[str]


class SubscriptionPlanList(BaseModel):
    plans: List[SubscriptionPlan]
    has_trial: bool
    trial_used: bool


class TrialSubscriptionCreate(BaseModel):
    """Создание пробной подписки"""
    pass


class AdminSubscriptionCreate(SubscriptionBase):
    user_id: int = Field(..., description="ID пользователя")
    end_date: Optional[datetime] = None
    downloads_limit: Optional[int] = None
    price: float = Field(..., description="Цена подписки")
    is_active: int = Field(1, description="Активна ли подписка")


class AdminSubscriptionUpdate(BaseModel):
    is_active: Optional[int] = None
    end_date: Optional[datetime] = None
    downloads_limit: Optional[int] = None
    downloads_used: Optional[int] = None


class SubscriptionCancel(BaseModel):
    reason: Optional[str] = None


class SubscriptionInDB(SubscriptionBase):
    id: int
    user_id: int
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime
    downloads_count: int = 0
    payment_id: Optional[int] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class Subscription(SubscriptionInDB):
    pass


class SubscriptionInfo(BaseModel):
    type: SubscriptionType
    name: str
    description: str
    price: float
    currency: str = "RUB"
    duration_days: int
    features: List[str]


class SubscriptionsList(BaseModel):
    subscriptions: List[SubscriptionInfo] 