"""
Enrollment Models - Course and Exam Enrollments
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class EnrollmentStatus(enum.Enum):
    """Enrollment status enum"""
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"


def enum_values(enum_cls):
    return [member.value for member in enum_cls]


class CourseEnrollment(Base):
    """Full course enrollment - gives access to all exams"""
    __tablename__ = "course_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    status = Column(
        SQLEnum(EnrollmentStatus, values_callable=enum_values, name="enrollment_status"),
        default=EnrollmentStatus.ACTIVE,
        nullable=False,
    )
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="course_enrollments")
    course = relationship("Course", backref="enrollments")
    payment = relationship("Payment", backref="course_enrollments")


class ExamEnrollment(Base):
    """Individual exam enrollment"""
    __tablename__ = "exam_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    status = Column(
        SQLEnum(EnrollmentStatus, values_callable=enum_values, name="enrollment_status"),
        default=EnrollmentStatus.ACTIVE,
        nullable=False,
    )
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="exam_enrollments")
    exam = relationship("Exam", backref="enrollments")
    payment = relationship("Payment", backref="exam_enrollments")
