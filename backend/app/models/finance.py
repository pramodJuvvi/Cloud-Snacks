from sqlalchemy import Column, DateTime, Float, Integer, String, func

from app.database import Base


class FinanceEntry(Base):
    __tablename__ = "finance_entries"

    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    paid_to = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    service_month = Column(String, nullable=True)
    entry_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
