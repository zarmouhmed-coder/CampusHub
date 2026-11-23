import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    *,
    actor_id: uuid.UUID | None,
    institution_id: uuid.UUID | None,
    action: str,
    target_type: str | None = None,
    target_id: object = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Append an entry to the audit log (committed with the caller's transaction)."""
    db.add(
        AuditLog(
            actor_id=actor_id,
            institution_id=institution_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details or {},
        )
    )
