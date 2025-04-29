from typing import Any, Dict, List, Optional, Union
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.auth.password import get_password_hash, verify_password


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Получение пользователя по email"""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Получение пользователя по ID"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_users(self, *, skip: int = 0, limit: int = 100) -> List[User]:
        """Получение списка пользователей с пагинацией"""
        query = select(User).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_user(self, *, user_in: UserCreate) -> User:
        """Создание нового пользователя"""
        db_obj = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password) if user_in.password else None,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            is_superuser=user_in.is_superuser,
            is_active=user_in.is_active,
        )
        
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        
        return db_obj

    async def create_or_update_google_user(self, email: str, first_name: str, last_name: str) -> User:
        """Создание или обновление пользователя из Google OAuth"""
        user = await self.get_user_by_email(email)
        
        if user:
            # Обновляем информацию о пользователе, если он уже существует
            user.first_name = first_name
            user.last_name = last_name
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        
        # Создаем нового пользователя
        user_data = UserCreate(
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=None  # Пользователи OAuth не имеют пароля
        )
        
        return await self.create_user(user_in=user_data)

    async def update_user(
        self, *, user_id: int, user_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """Обновление данных пользователя"""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            return None
        
        if isinstance(user_in, dict):
            update_data = user_in
        else:
            update_data = user_in.dict(exclude_unset=True)
        
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        
        for field in update_data:
            if field in update_data:
                setattr(user, field, update_data[field])
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user

    async def delete_user(self, *, user_id: int) -> User:
        """Удаление пользователя"""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            return None
        
        await self.db.delete(user)
        await self.db.commit()
        
        return user

    async def authenticate(self, *, email: str, password: str) -> Optional[User]:
        """Аутентификация пользователя"""
        user = await self.get_user_by_email(email)
        
        if not user or not user.hashed_password:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user

    def is_active(self, user: User) -> bool:
        """Проверить, активен ли пользователь."""
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        """Проверить, является ли пользователь суперпользователем."""
        return user.is_superuser 