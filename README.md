# YouTube Downloader

Сервис для загрузки видео с YouTube и других платформ.

## Функции

- Скачивание видео с YouTube, TikTok, Instagram, VK и других платформ
- Поддержка различных форматов и разрешений
- Конвертация видео в различные форматы
- Система пользователей и подписок
- Платежная система с поддержкой различных методов оплаты

## Платежная система

Сервис поддерживает следующие платежные системы:
- YooKassa (ЮKassa)
- Stripe

### Методы оплаты:
- Банковские карты
- ЮMoney
- QIWI
- WebMoney
- Система быстрых платежей (СБП)

### Типы подписок:
- Базовая - 199 руб/месяц (до 10 скачиваний в месяц, видео до 720p)
- Премиум - 499 руб/месяц (до 50 скачиваний в месяц, видео до 1080p)
- Безлимитная - 999 руб/месяц (неограниченное количество скачиваний, видео до 4K)

## Установка и запуск

### Требования
- Python 3.8+
- Node.js 14+
- MySQL 8.0+
- Redis (опционально)

### Backend

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Настройка платежных систем

Для работы с платежными системами необходимо указать соответствующие ключи в файле `.env`:

```
# Общие настройки платежей
PAYMENT_PROVIDER=yookassa  # или stripe, test
PAYMENT_TEST_MODE=True

# YooKassa
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key

# Stripe
STRIPE_SECRET_KEY=your_secret_key
STRIPE_PUBLIC_KEY=your_public_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Разработка

### Backend
- FastAPI
- SQLAlchemy
- Pydantic
- yt-dlp

### Frontend
- Next.js
- React
- Ant Design 