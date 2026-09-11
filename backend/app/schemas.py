from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    target_role: str | None = None


class StudentUpdate(BaseModel):
    name: str | None = None
    target_role: str | None = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    target_role: str | None
    created_at: datetime
    updated_at: datetime
