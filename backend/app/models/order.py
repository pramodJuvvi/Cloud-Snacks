from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    delivery_address = Column(String, nullable=True)
    delivery_note = Column(String, nullable=True)
    scheduled_for = Column(String, nullable=True)
    spice_level = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    coupon_code = Column(String, nullable=True)
    discount = Column(Float, nullable=False, default=0)
    delivery_partner = Column(String, nullable=True)
    feedback_rating = Column(Integer, nullable=True)
    feedback_note = Column(String, nullable=True)
    issue_report = Column(String, nullable=True)
    status = Column(String, nullable=False, default="received")
    subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    snack_id = Column(Integer, ForeignKey("snacks.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    snack = relationship("Snack")
