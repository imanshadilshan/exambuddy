"""
Payment API Endpoints - PayHere Integration & Bank Slip Upload
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import hashlib
import json
import os

from app.database import get_db
from app.models.user import User
from app.models.payment import Payment, BankSlip, PaymentMethod, PaymentStatus, PaymentType, BankSlipStatus
from app.models.course import Course
from app.models.exam import Exam
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.models.student import Student
from app.config import settings
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    BankSlipUpload,
    BankSlipResponse,
    BankSlipVerification
)
from app.api.v1.auth import get_current_user

router = APIRouter()

# PayHere Configuration (from environment variables)
PAYHERE_MERCHANT_ID = os.getenv("PAYHERE_MERCHANT_ID", "")
PAYHERE_MERCHANT_SECRET = os.getenv("PAYHERE_MERCHANT_SECRET", "")
from app.services.payment_service import PaymentService

# ========== Student Payment Endpoints ==========

@router.post("/initiate", response_model=PaymentResponse)
def initiate_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate a payment for course or exam enrollment
    Returns payment details for PayHere or bank slip upload
    """
    service = PaymentService(db)
    return service.initiate_payment(payment_data, current_user)


@router.get("/payhere/config")
def get_payhere_config(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get PayHere payment configuration for frontend integration
    """
    service = PaymentService(db)
    return service.get_payhere_config(payment_id, current_user)


@router.post("/payhere/notify")
async def payhere_notify(
    merchant_id: str = Form(...),
    order_id: str = Form(...),
    payhere_amount: str = Form(...),
    payhere_currency: str = Form(...),
    status_code: str = Form(...),
    md5sig: str = Form(...),
    payment_id: str = Form(None),
    custom_1: str = Form(None),
    custom_2: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    PayHere payment notification callback (webhook)
    """
    service = PaymentService(db)
    return service.payhere_notify(
        merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig, payment_id, custom_1, custom_2
    )


@router.post("/bank-slip/upload", response_model=BankSlipResponse)
async def upload_bank_slip(
    payment_id: UUID = Form(...),
    bank_name: Optional[str] = Form(None),
    depositor_name: Optional[str] = Form(None),
    deposit_date: Optional[str] = Form(None),
    reference_number: Optional[str] = Form(None),
    slip_image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload bank slip for payment verification
    """
    service = PaymentService(db)
    return await service.upload_bank_slip(
        payment_id, current_user, slip_image, bank_name, depositor_name, deposit_date, reference_number
    )


@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payments for current user"""
    service = PaymentService(db)
    return service.get_my_payments(current_user)


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_details(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific payment details"""
    service = PaymentService(db)
    return service.get_payment_details(payment_id, current_user)
