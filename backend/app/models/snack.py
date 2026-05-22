from sqlalchemy import Boolean, Column, Float, Integer, String

from app.database import Base


class Snack(Base):
    __tablename__ = "snacks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    prep_minutes = Column(Integer, nullable=False)
    calories = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    accent = Column(String, nullable=False)
    ingredients = Column(String, nullable=False, default="")
    allergens = Column(String, nullable=False, default="")
    is_available = Column(Boolean, nullable=False, default=True)
