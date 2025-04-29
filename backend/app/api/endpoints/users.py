from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_superuser, get_current_active_user, get_db
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user import UserService
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[UserOut])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Получить список пользователей.
    Только для суперпользователей.
    """
    user_service = UserService(db)
    users = await user_service.get_users(skip=skip, limit=limit)
    return users


@router.post("/", response_model=UserOut)
async def create_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Создать нового пользователя.
    Только для суперпользователей.
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_email(email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    user = await user_service.create_user(user_in=user_in)
    return user


@router.get("/me", response_model=UserOut)
async def read_user_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Получить информацию о текущем пользователе.
    """
    return current_user


@router.put("/me", response_model=UserOut)
async def update_user_me(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Обновить информацию о текущем пользователе.
    """
    user_service = UserService(db)
    user = await user_service.update_user(user_id=current_user.id, user_in=user_in)
    return user


@router.get("/{user_id}", response_model=UserOut)
async def read_user_by_id(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Получить информацию о пользователе по ID.
    Только для суперпользователей.
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    return user


@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Обновить информацию о пользователе.
    Только для суперпользователей.
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    user = await user_service.update_user(user_id=user_id, user_in=user_in)
    return user


@router.delete("/{user_id}", response_model=UserOut)
async def delete_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: int,
    current_user: User = Depends(get_current_active_superuser),
) -> Any:
    """
    Удалить пользователя.
    Только для суперпользователей.
    """
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )
    user = await user_service.delete_user(user_id=user_id)
    return user 