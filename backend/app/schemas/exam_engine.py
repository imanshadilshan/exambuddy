"""
Schemas for student exam engine and ranking responses.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime


class ExamQuestionOptionView(BaseModel):
    id: str
    option_text: Optional[str]
    option_image_url: Optional[str]
    order_number: int


class ExamQuestionView(BaseModel):
    id: str
    question_text: str
    question_image_url: Optional[str]
    explanation: Optional[str]
    order_number: int
    options: List[ExamQuestionOptionView]


class StartExamResponse(BaseModel):
    attempt_id: UUID
    exam_id: UUID
    exam_title: str
    subject: str
    duration_minutes: int
    started_at: datetime
    ends_at: datetime
    questions: List[ExamQuestionView]


class SubmitAnswerItem(BaseModel):
    question_id: str
    selected_option_id: Optional[str] = None


class SubmitExamRequest(BaseModel):
    answers: List[SubmitAnswerItem] = Field(default_factory=list)


class ExamQuestionReview(BaseModel):
    question_id: str
    question_text: str
    explanation: Optional[str]
    selected_option_id: Optional[str]
    correct_option_id: str
    is_correct: bool


class RankingInfo(BaseModel):
    exam_id: str
    exam_title: str
    course_title: str
    subject: str
    overall_rank: Optional[int] = None
    district_rank: Optional[int] = None


class SubmitExamResponse(BaseModel):
    attempt_id: UUID
    marks_obtained: int
    total_questions: int
    time_taken_seconds: int
    review: List[ExamQuestionReview]
    ranking: RankingInfo


class ExamRankResponse(BaseModel):
    exam_id: str
    exam_title: str
    course_title: str
    subject: str
    overall_rank: Optional[int] = None
    district_rank: Optional[int] = None
