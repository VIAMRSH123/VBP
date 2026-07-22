from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import CurrentUser, get_current_user
from app.auth.security import create_access_token, verify_password
from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, TokenResponse
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.active_flag:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token(subject=user.id, role=user.role)
    record_audit(db, actor=user.email, actor_role=user.role, action="login", entity_type="user", entity_id=user.id)
    return TokenResponse(access_token=token, role=user.role, name=user.name, user_id=user.id)


@router.get("/me", response_model=MeResponse)
def me(current: CurrentUser = Depends(get_current_user)):
    return MeResponse(
        id=current.id,
        name=current.name,
        email=current.email,
        role=current.role,
        representative_id=current.representative_id,
    )
