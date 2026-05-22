from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, func

from app.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, default="Ingredients")
    unit = Column(String, nullable=False, default="kg")
    quantity = Column(Float, nullable=False, default=0)
    reorder_level = Column(Float, nullable=False, default=0)
    unit_cost = Column(Float, nullable=False, default=0)
    supplier = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RecipeCost(Base):
    __tablename__ = "recipe_costs"

    id = Column(Integer, primary_key=True, index=True)
    snack_id = Column(Integer, nullable=True, index=True)
    snack_name = Column(String, nullable=False, index=True)
    ingredient_cost = Column(Float, nullable=False, default=0)
    packaging_cost = Column(Float, nullable=False, default=0)
    labor_cost = Column(Float, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StaffShift(Base):
    __tablename__ = "staff_shifts"

    id = Column(Integer, primary_key=True, index=True)
    staff_name = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, default="Kitchen")
    attendance_status = Column(String, nullable=False, default="present")
    hours = Column(Float, nullable=False, default=0)
    hourly_rate = Column(Float, nullable=False, default=0)
    notes = Column(String, nullable=True)
    shift_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False, unique=True, index=True)
    description = Column(String, nullable=False, default="")
    discount_type = Column(String, nullable=False, default="flat")
    discount_value = Column(Float, nullable=False, default=0)
    min_order_value = Column(Float, nullable=False, default=0)
    max_discount = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
