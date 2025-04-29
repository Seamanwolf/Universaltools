from app.models import Download, User, Subscription
from app.db.session import async_session
from sqlalchemy.future import select
from datetime import datetime
import asyncio

async def add_test_download():
    async with async_session() as session:
        # Проверим наличие администратора
        user_query = select(User).where(User.role == 'admin')
        result = await session.execute(user_query)
        admin = result.scalar_one_or_none()
        
        if not admin:
            print('Создаем администратора')
            admin = User(
                email='admin@example.com',
                username='admin',
                hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  # password: password
                role='admin',
                is_active=True
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
        
        # Проверим наличие активной подписки
        subscription_query = select(Subscription).where(Subscription.user_id == admin.id, Subscription.is_active == True)
        result = await session.execute(subscription_query)
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            print('Создаем подписку')
            subscription = Subscription(
                user_id=admin.id,
                type='premium',
                is_active=True,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow().replace(year=datetime.utcnow().year + 1),
                downloads_limit=100,
                downloads_used=0
            )
            session.add(subscription)
            await session.commit()
            await session.refresh(subscription)
        
        # Добавляем тестовые загрузки за несколько дней
        today = datetime.utcnow()
        
        for i in range(5):
            download_date = today.replace(day=today.day - i)
            
            # Создаем успешную загрузку
            download = Download(
                user_id=admin.id,
                subscription_id=subscription.id,
                video_id=f'test_video_{i}',
                video_title=f'Test Video {i}',
                url=f'https://www.youtube.com/watch?v=test{i}',
                format='mp4',
                quality='1080p',
                status='completed',
                created_at=download_date
            )
            session.add(download)
            
            # Создаем проваленную загрузку
            if i % 2 == 0:
                download = Download(
                    user_id=admin.id,
                    subscription_id=subscription.id,
                    video_id=f'failed_video_{i}',
                    video_title=f'Failed Video {i}',
                    url=f'https://www.youtube.com/watch?v=failed{i}',
                    format='mp4',
                    quality='1080p',
                    status='failed',
                    created_at=download_date
                )
                session.add(download)
        
        await session.commit()
        print('Тестовые загрузки успешно добавлены!')

if __name__ == "__main__":
    asyncio.run(add_test_download()) 