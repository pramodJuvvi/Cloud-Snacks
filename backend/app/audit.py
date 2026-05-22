import json
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import AuditEvent


def request_metadata(request: Request | None) -> dict[str, str]:
    if request is None:
        return {}

    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    return {
        "client_ip": client_ip,
        "user_agent": user_agent[:200],
    }


def record_audit_event(
    db: Session,
    *,
    event_type: str,
    summary: str,
    actor_type: str = "system",
    actor_id: int | None = None,
    actor_label: str | None = None,
    order_id: int | None = None,
    snack_id: int | None = None,
    customer_phone: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        actor_label=actor_label,
        order_id=order_id,
        snack_id=snack_id,
        customer_phone=customer_phone,
        summary=summary,
        metadata_json=json.dumps(metadata or {}, default=str),
    )
    db.add(event)
    return event
