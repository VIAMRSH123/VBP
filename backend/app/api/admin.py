from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, admin_only
from app.auth.security import hash_password
from app.db import get_db
from app.models.audit import AuditLog
from app.models.config import Configuration
from app.models.user import User
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/admin", tags=["administration"])


@router.get("/audit-log")
def list_audit_log(limit: int = 100, db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    entries = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": e.id, "actor": e.actor, "actor_role": e.actor_role, "action": e.action,
            "entity_type": e.entity_type, "entity_id": e.entity_id, "details": e.details, "created_at": e.created_at,
        }
        for e in entries
    ]


class ConfigUpsert(BaseModel):
    key: str
    value: str
    category: str = "general"
    description: str = ""


@router.get("/configuration")
def list_configuration(db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    return db.query(Configuration).all()


@router.put("/configuration")
def upsert_configuration(payload: ConfigUpsert, db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    row = db.query(Configuration).filter(Configuration.key == payload.key).first()
    if row:
        row.value = payload.value
    else:
        row = Configuration(key=payload.key, value=payload.value, category=payload.category, description=payload.description)
        db.add(row)
    db.commit()
    record_audit(db, actor=current.email, actor_role=current.role, action="config.update", entity_type="configuration", entity_id=payload.key, details=payload.value)
    return {"key": payload.key, "value": payload.value}


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: str = ""
    representative_id: str = ""


@router.get("/users")
def list_users(db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    users = db.query(User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active_flag} for u in users]


@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db), current: CurrentUser = Depends(admin_only)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    user = User(
        name=payload.name, email=payload.email, phone=payload.phone,
        hashed_password=hash_password(payload.password), role=payload.role,
        representative_id=payload.representative_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    record_audit(db, actor=current.email, actor_role=current.role, action="user.create", entity_type="user", entity_id=user.id)
    return {"id": user.id, "email": user.email, "role": user.role}
