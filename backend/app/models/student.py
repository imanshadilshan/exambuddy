"""
Student Model
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Student(Base):
    """
    Student profile model
    Extends User with student-specific information
    """
    __tablename__ = "students"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    school = Column(String, nullable=False)
    district = Column(String, nullable=False)
    grade = Column(Integer, nullable=False)  # 10, 11, 12, 13
    profile_photo_url = Column(String, nullable=True)
    has_paid = Column(Boolean, default=False)
    payment_verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="student")
    
    def __repr__(self):
        return f"<Student {self.full_name} (Grade {self.grade})>"
