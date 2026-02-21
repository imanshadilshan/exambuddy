"""
Question Schemas
"""
from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List, Union
from uuid import UUID


class QuestionOptionBase(BaseModel):
    option_text: Optional[str] = None
    option_image_url: Optional[str] = None
    option_image_public_id: Optional[str] = None
    is_correct: bool = False
    order_number: int


class QuestionOptionCreate(QuestionOptionBase):
    pass


class QuestionOptionUpdate(BaseModel):
    option_text: Optional[str] = None
    option_image_url: Optional[str] = None
    option_image_public_id: Optional[str] = None
    is_correct: Optional[bool] = None
    order_number: Optional[int] = None


class QuestionOptionResponse(QuestionOptionBase):
    id: str
    question_id: str

    class Config:
        from_attributes = True


class QuestionBase(BaseModel):
    question_text: str
    question_image_url: Optional[str] = None
    question_image_public_id: Optional[str] = None
    explanation: Optional[str] = None
    order_number: int


class QuestionCreate(QuestionBase):
    exam_id: str
    options: List[QuestionOptionCreate] = Field(..., min_length=2, max_length=10)


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_image_url: Optional[str] = None
    question_image_public_id: Optional[str] = None
    explanation: Optional[str] = None
    order_number: Optional[int] = None
    options: Optional[List[QuestionOptionUpdate]] = None


class QuestionResponse(QuestionBase):
    id: str
    exam_id: Union[str, UUID]
    options: List[QuestionOptionResponse] = []

    @field_serializer('exam_id')
    def serialize_exam_id(self, exam_id: Union[str, UUID], _info):
        return str(exam_id)

    class Config:
        from_attributes = True


class QuestionImportCSV(BaseModel):
    """Schema for CSV import - simplified structure"""
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str] = None  # For grade 12-13
    correct_answer: str  # Should be 'A', 'B', 'C', 'D', or 'E'
    explanation: Optional[str] = None
