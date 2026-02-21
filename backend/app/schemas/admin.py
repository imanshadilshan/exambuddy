"""
Admin Schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class AdminBase(BaseModel):
    """Base admin schema"""
    full_name: str


class AdminResponse(BaseModel):
    """Admin response schema"""
    id: UUID
    user_id: UUID
    full_name: str
    permissions: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AdminCreate(BaseModel):
    """Schema for creating admin"""
    email: str
    password: str
    full_name: str
    permissions: Optional[Dict[str, Any]] = None
