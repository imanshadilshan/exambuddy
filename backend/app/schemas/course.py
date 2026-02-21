"""
Course Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    subject: str = Field(..., min_length=2, max_length=100)
    grade: int = Field(..., ge=10, le=13)
    image_url: Optional[str] = Field(default=None, min_length=5, max_length=500)
    image_public_id: Optional[str] = Field(default=None, max_length=255)
    price: int = Field(..., ge=0)
    description: Optional[str] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    subject: Optional[str] = Field(default=None, min_length=2, max_length=100)
    grade: Optional[int] = Field(default=None, ge=10, le=13)
    image_url: Optional[str] = Field(default=None, min_length=5, max_length=500)
    image_public_id: Optional[str] = Field(default=None, max_length=255)
    price: Optional[int] = Field(default=None, ge=0)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CourseResponse(BaseModel):
    id: UUID
    title: str
    subject: str
    grade: int
    image_url: Optional[str]
    image_public_id: Optional[str]
    price: int
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
