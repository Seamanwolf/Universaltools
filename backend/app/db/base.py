# Импортируем все модели, чтобы их можно было использовать для создания таблиц

from app.db.base_class import Base

# Импортируем модели
from app.models.user import User
from app.models.download import Download
from app.models.subscription import Subscription
from app.models.payment import Payment, PaymentHistory 