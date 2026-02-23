"""
Exam Attempt Models
Handles timer-based exam attempts, answer submissions, and ranking metrics.
"""
import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ExamAttemptStatus(enum.Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    TIMEOUT = "timeout"


def enum_values(enum_cls):
    return [member.value for member in enum_cls]


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)

    status = Column(
        SQLEnum(ExamAttemptStatus, values_callable=enum_values, name="exam_attempt_status"),
        default=ExamAttemptStatus.IN_PROGRESS,
        nullable=False,
    )

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    time_taken_seconds = Column(Integer, nullable=True)
    marks_obtained = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="exam_attempts")
    exam = relationship("Exam", backref="attempts")
    answers = relationship("ExamAttemptAnswer", back_populates="attempt", cascade="all, delete-orphan")


class ExamAttemptAnswer(Base):
    __tablename__ = "exam_attempt_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    selected_option_id = Column(String, ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True)
    is_correct = Column(Integer, nullable=False, default=0)  # 1=true, 0=false

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attempt = relationship("ExamAttempt", back_populates="answers")
    question = relationship("Question")
    selected_option = relationship("QuestionOption")
