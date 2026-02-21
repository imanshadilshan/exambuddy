"""
Exam Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ExamCreate(BaseModel):
    course_id: UUID
    title: str = Field(..., min_length=2, max_length=200)
    image_url: Optional[str] = Field(default=None, min_length=5, max_length=500)
    image_public_id: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    duration_minutes: int = Field(..., ge=1, le=480)
    total_questions: int = Field(..., ge=0)


class ExamUpdate(BaseModel):
    course_id: Optional[UUID] = None
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    image_url: Optional[str] = Field(default=None, min_length=5, max_length=500)
    image_public_id: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=480)
    total_questions: Optional[int] = Field(default=None, ge=0)
    is_published: Optional[bool] = None


class ExamResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    image_url: Optional[str]
    image_public_id: Optional[str]
    description: Optional[str]
    duration_minutes: int
    total_questions: int
    is_published: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
