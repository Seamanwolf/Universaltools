from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    """
    Базовый класс для всех моделей SQLAlchemy
    """
    __abstract__ = True
    
    # Автоматическое создание имени таблицы
    @declared_attr.directive
    @classmethod
    def __tablename__(cls) -> str:
        return cls.__name__.lower() 