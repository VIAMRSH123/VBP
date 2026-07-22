from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    user_id: str


class MeResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    representative_id: str = ""
