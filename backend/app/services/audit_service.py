from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def record_audit(
    db: Session,
    *,
    actor: str,
    actor_role: str = "",
    action: str,
    entity_type: str = "",
    entity_id: str = "",
    details: str = "",
    ip_address: str = "",
) -> AuditLog:
    """Insert-only audit trail entry. Never update or delete rows (Part 9: immutable audit logs)."""
    entry = AuditLog(
        actor=actor,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
