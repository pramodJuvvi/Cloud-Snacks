from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    actor_type = Column(String, nullable=False, default="system")
    actor_id = Column(Integer, nullable=True)
    actor_label = Column(String, nullable=True)
    order_id = Column(Integer, nullable=True, index=True)
    snack_id = Column(Integer, nullable=True, index=True)
    customer_phone = Column(String, nullable=True, index=True)
    summary = Column(String, nullable=False)
    metadata_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
