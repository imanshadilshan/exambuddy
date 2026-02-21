"""
Question Model
Represents MCQ questions for exams
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(UUID(as_uuid=False), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_image_url = Column(String, nullable=True)
    question_image_public_id = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    order_number = Column(Integer, nullable=False)  # Question order in exam (1, 2, 3...)

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    options = relationship("QuestionOption", back_populates="question", cascade="all, delete-orphan")


class QuestionOption(Base):
    __tablename__ = "question_options"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text = Column(Text, nullable=True)  # Can be null if only image
    option_image_url = Column(String, nullable=True)
    option_image_public_id = Column(String, nullable=True)
    is_correct = Column(Boolean, default=False, nullable=False)
    order_number = Column(Integer, nullable=False)  # Option order (A, B, C, D = 1, 2, 3, 4)

    # Relationships
    question = relationship("Question", back_populates="options")
