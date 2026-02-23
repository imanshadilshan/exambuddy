"""
Enrollment Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class CourseEnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    payment_id: Optional[UUID]
    status: str
    enrolled_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExamEnrollmentResponse(BaseModel):
    id: UUID
    user_id: UUID
    exam_id: UUID
    payment_id: Optional[UUID]
    status: str
    enrolled_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class EnrollFreeExamRequest(BaseModel):
    exam_id: UUID
