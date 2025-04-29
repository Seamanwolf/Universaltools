from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

from app.models.payment import PaymentStatus, PaymentMethod
from app.models.subscription import SubscriptionType

class PaymentBase(BaseModel):
    subscription_type: SubscriptionType = Field(..., description="Тип подписки")
    payment_method: PaymentMethod = Field(..., description="Метод оплаты")


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(BaseModel):
    id: int
    status: PaymentStatus
    amount: float
    payment_url: Optional[str] = None
    message: str = "Платеж инициирован"
    
    class Config:
        orm_mode = True


class PaymentDetail(BaseModel):
    id: int
    user_id: int
    subscription_id: int
    amount: float
    payment_method: PaymentMethod
    status: PaymentStatus
    transaction_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        orm_mode = True


class PaymentCallback(BaseModel):
    payment_id: str = Field(..., description="ID платежа в платежной системе")
    status: str = Field(..., description="Статус платежа")
    data: Optional[Dict[str, Any]] = None


class AdminPaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    transaction_id: Optional[str] = None


class CardPaymentInfo(BaseModel):
    card_number: str = Field(..., description="Номер карты")
    expiry_date: str = Field(..., description="Срок действия карты MM/YY")
    cvv: str = Field(..., description="CVV код карты")
    cardholder_name: str = Field(..., description="Имя держателя карты") 