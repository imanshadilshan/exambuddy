"""
Payment Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class PaymentCreate(BaseModel):
    payment_type: str  # "course" or "exam"
    course_id: Optional[UUID] = None
    exam_id: Optional[UUID] = None
    payment_method: str  # "payhere" or "bank_slip"


class PaymentResponse(BaseModel):
    id: UUID
    user_id: UUID
    payment_type: str
    course_id: Optional[UUID]
    exam_id: Optional[UUID]
    amount: int
    payment_method: str
    status: str
    payhere_order_id: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class BankSlipUpload(BaseModel):
    payment_id: UUID
    bank_name: Optional[str] = None
    depositor_name: Optional[str] = None
    deposit_date: Optional[datetime] = None
    reference_number: Optional[str] = None


class BankSlipResponse(BaseModel):
    id: UUID
    payment_id: UUID
    user_id: UUID
    slip_image_url: str
    slip_image_public_id: Optional[str]
    bank_name: Optional[str]
    depositor_name: Optional[str]
    deposit_date: Optional[datetime]
    reference_number: Optional[str]
    status: str
    verified_by: Optional[UUID]
    verified_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BankSlipVerification(BaseModel):
    status: str  # "verified" or "rejected"
    rejection_reason: Optional[str] = None
