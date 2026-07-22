from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@dataclass
class CurrentUser:
    id: str
    email: str
    name: str
    role: str
    representative_id: str = ""
    phone: str = ""


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> CurrentUser:
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    user = db.get(User, user_id)
    if user is None or not user.active_flag:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return CurrentUser(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        representative_id=user.representative_id,
        phone=user.phone,
    )


def require_roles(*allowed_roles: str):
    def _dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to perform this action",
            )
        return user

    return _dependency


# Common role bundles used across routers (least privilege per Part 9)
any_authenticated = require_roles(
    "administrator", "sales_manager", "sales_representative", "executive", "read_only_auditor"
)
admin_only = require_roles("administrator")
managers_and_admin = require_roles("administrator", "sales_manager")
write_roles = require_roles("administrator", "sales_manager", "sales_representative")
insight_roles = require_roles("administrator", "sales_manager", "executive")
