"""
Student Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class StudentBase(BaseModel):
    """Base student schema"""
    full_name: str
    phone_number: str
    school: str
    district: str
    grade: int


class StudentResponse(BaseModel):
    """Student response schema"""
    id: UUID
    user_id: UUID
    full_name: str
    phone_number: str
    school: str
    district: str
    grade: int
    profile_photo_url: Optional[str]
    has_paid: bool
    payment_verified_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class StudentWithUser(BaseModel):
    """Student with user data"""
    user: dict
    student: StudentResponse
    
    class Config:
        from_attributes = True
