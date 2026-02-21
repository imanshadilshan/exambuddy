"""
Course Model
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Course(Base):
    """Course entity for a grade and subject"""
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=False, index=True)
    grade = Column(Integer, nullable=False, index=True)
    image_url = Column(String, nullable=True)
    image_public_id = Column(String, nullable=True)
    price = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    exams = relationship("Exam", back_populates="course", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course {self.title} ({self.subject} - Grade {self.grade})>"
