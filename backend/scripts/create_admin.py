#!/usr/bin/env python
import asyncio
import sys
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from datetime import datetime

# Добавляем путь к приложению
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.user import User, UserRole
from app.core.config import settings
from app.auth.password import get_password_hash
from app.db.base import Base

async def create_admin_user():
    # Создаем строку подключения к базе данных в соответствии с docker-compose.yml
    DATABASE_URL = "mysql+aiomysql://root:root@localhost:3307/youtubedb"
    
    # Создаем движок базы данных
    engine = create_async_engine(DATABASE_URL)
    
    # Создаем таблицы
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )
    
    # Хешируем пароль
    hashed_password = get_password_hash("Gfzkmybr72")
    
    # Создаем пользователя-администратора
    admin_user = User(
        email="admin@example.com",  # Email обязателен в схеме
        username="admin",
        hashed_password=hashed_password,
        is_active=True,
        is_superuser=True,
        role=UserRole.ADMIN,
    )
    
    async with async_session() as session:
        # Проверяем, существует ли уже пользователь с таким именем
        query = select(User).where(User.username == "admin")
        result = await session.execute(query)
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print("Пользователь с именем 'admin' уже существует. Обновляю данные...")
            existing_user.hashed_password = hashed_password
            existing_user.is_active = True
            existing_user.is_superuser = True
            existing_user.role = UserRole.ADMIN
            session.add(existing_user)
        else:
            print("Создаю нового пользователя-администратора...")
            session.add(admin_user)
        
        await session.commit()
        print("Администратор успешно создан/обновлен!")
        print("Логин: admin")
        print("Пароль: Gfzkmybr72")
        print("Email: admin@example.com")

if __name__ == "__main__":
    asyncio.run(create_admin_user()) 