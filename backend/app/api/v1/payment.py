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
PAYHERE_SANDBOX = os.getenv("PAYHERE_SANDBOX", "True").lower() == "true"


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
    # Verify user is a student
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=403, detail="Only students can make payments")
    
    # Validate payment type and get price
    amount = 0
    course = None
    exam = None
    
    if payment_data.payment_type == "course":
        if not payment_data.course_id:
            raise HTTPException(status_code=400, detail="course_id required for course payment")
        course = db.query(Course).filter(Course.id == payment_data.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        amount = course.price
        
        # Check if already enrolled
        existing = db.query(CourseEnrollment).filter(
            and_(
                CourseEnrollment.user_id == current_user.id,
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.status == EnrollmentStatus.ACTIVE.value
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    elif payment_data.payment_type == "exam":
        if not payment_data.exam_id:
            raise HTTPException(status_code=400, detail="exam_id required for exam payment")
        exam = db.query(Exam).filter(Exam.id == payment_data.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        amount = exam.price
        
        # Check if already enrolled
        existing = db.query(ExamEnrollment).filter(
            and_(
                ExamEnrollment.user_id == current_user.id,
                ExamEnrollment.exam_id == exam.id,
                ExamEnrollment.status == EnrollmentStatus.ACTIVE.value
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already enrolled in this exam")
    else:
        raise HTTPException(status_code=400, detail="Invalid payment_type. Use 'course' or 'exam'")
    
    # Create payment record
    payment = Payment(
        user_id=current_user.id,
        payment_type=payment_data.payment_type,
        course_id=payment_data.course_id,
        exam_id=payment_data.exam_id,
        amount=amount,
        payment_method=payment_data.payment_method,
        status=PaymentStatus.PENDING.value
    )
    
    # Generate PayHere order ID if PayHere method
    if payment_data.payment_method == "payhere":
        payment.payhere_order_id = f"EB_{payment.id}"
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment


@router.get("/payhere/config")
def get_payhere_config(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get PayHere payment configuration for frontend integration
    """
    payment = db.query(Payment).filter(
        and_(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        )
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Normalize payment method (SQLAlchemy may return enum member or string)
    pm_value = payment.payment_method.value if hasattr(payment.payment_method, 'value') else payment.payment_method
    if pm_value != PaymentMethod.PAYHERE.value:
        raise HTTPException(status_code=400, detail="Payment method is not PayHere")
    
    # Get item name
    pt_value = payment.payment_type.value if hasattr(payment.payment_type, 'value') else payment.payment_type
    item_name = "ExamBuddy Enrollment"
    if pt_value == PaymentType.COURSE.value and payment.course:
        item_name = f"Course: {payment.course.title}"
    elif pt_value == PaymentType.EXAM.value and payment.exam:
        item_name = f"Exam: {payment.exam.title}"
    
    # Generate hash (MD5 hash of: merchant_id + order_id + amount + currency + MD5(merchant_secret))
    merchant_secret_hash = hashlib.md5(PAYHERE_MERCHANT_SECRET.encode()).hexdigest().upper()
    hash_string = f"{PAYHERE_MERCHANT_ID}{payment.payhere_order_id}{payment.amount:.2f}LKR{merchant_secret_hash}"
    hash_value = hashlib.md5(hash_string.encode()).hexdigest().upper()
    
    return {
        "merchant_id": PAYHERE_MERCHANT_ID,
        "return_url": f"{settings.FRONTEND_URL}/payment/success",
        "cancel_url": f"{settings.FRONTEND_URL}/payment/cancel",
        "notify_url": f"{settings.BACKEND_URL}/api/v1/payment/payhere/notify",
        "order_id": payment.payhere_order_id,
        "items": item_name,
        "currency": "LKR",
        "amount": f"{payment.amount:.2f}",
        "first_name": current_user.profile.full_name.split()[0] if current_user.profile and current_user.profile.full_name else current_user.email,
        "last_name": " ".join(current_user.profile.full_name.split()[1:]) if current_user.profile and current_user.profile.full_name else "",
        "email": current_user.email,
        "phone": current_user.profile.phone if current_user.profile else "",
        "address": current_user.profile.address if current_user.profile else "",
        "city": current_user.profile.city if current_user.profile else "",
        "country": "Sri Lanka",
        "hash": hash_value,
        "sandbox": PAYHERE_SANDBOX
    }


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
    # Verify hash
    merchant_secret_hash = hashlib.md5(PAYHERE_MERCHANT_SECRET.encode()).hexdigest().upper()
    local_hash_string = f"{merchant_id}{order_id}{payhere_amount}{payhere_currency}{status_code}{merchant_secret_hash}"
    local_hash = hashlib.md5(local_hash_string.encode()).hexdigest().upper()
    
    if local_hash != md5sig:
        raise HTTPException(status_code=400, detail="Invalid hash signature")
    
    # Find payment by order_id
    payment = db.query(Payment).filter(Payment.payhere_order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Update payment status based on PayHere status code
    # Status codes: 2 = success, 0 = pending, -1 = canceled, -2 = failed, -3 = chargedback
    if status_code == "2":
        payment.status = PaymentStatus.COMPLETED.value
        payment.completed_at = datetime.utcnow()
        payment.payhere_payment_id = payment_id
        
        # Activate enrollment
        _activate_enrollment(payment, db)
        
    elif status_code in ["-1", "-2"]:
        payment.status = PaymentStatus.FAILED.value
    elif status_code == "-3":
        payment.status = PaymentStatus.REFUNDED.value
    
    # Store transaction data
    transaction_data = {
        "merchant_id": merchant_id,
        "payhere_payment_id": payment_id,
        "status_code": status_code,
        "amount": payhere_amount,
        "currency": payhere_currency,
        "custom_1": custom_1,
        "custom_2": custom_2
    }
    payment.transaction_data = json.dumps(transaction_data)
    
    db.commit()
    
    return {"status": "ok"}


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
    # Verify payment exists and belongs to user
    payment = db.query(Payment).filter(
        and_(
            Payment.id == payment_id,
            Payment.user_id == current_user.id,
            Payment.payment_method == PaymentMethod.BANK_SLIP.value
        )
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check if slip already uploaded
    existing_slip = db.query(BankSlip).filter(BankSlip.payment_id == payment_id).first()
    if existing_slip:
        raise HTTPException(status_code=400, detail="Bank slip already uploaded for this payment")
    
    # Validate file type and size
    if not slip_image.content_type or not slip_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    file_bytes = await slip_image.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    max_size_bytes = 5 * 1024 * 1024
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(status_code=400, detail="Image size must be 5MB or less")

    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
        raise HTTPException(status_code=500, detail="Cloudinary configuration is missing")

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder=f"{settings.CLOUDINARY_FOLDER}/bank_slips",
            resource_type="image",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Bank slip upload failed: {str(exc)}")

    image_url = upload_result.get("secure_url") or upload_result.get("url")
    image_public_id = upload_result.get("public_id")
    if not image_url or not image_public_id:
        raise HTTPException(status_code=500, detail="Invalid upload response from Cloudinary")
    
    # Create bank slip record
    bank_slip = BankSlip(
        payment_id=payment_id,
        user_id=current_user.id,
        slip_image_url=image_url,
        slip_image_public_id=image_public_id,
        bank_name=bank_name,
        depositor_name=depositor_name,
        deposit_date=datetime.fromisoformat(deposit_date) if deposit_date else None,
        reference_number=reference_number,
        status=BankSlipStatus.PENDING.value
    )
    
    db.add(bank_slip)
    db.commit()
    db.refresh(bank_slip)
    
    return bank_slip


@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payments for current user"""
    payments = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()
    return payments


@router.get("/payment/{payment_id}", response_model=PaymentResponse)
def get_payment_details(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific payment details"""
    payment = db.query(Payment).filter(
        and_(
            Payment.id == payment_id,
            Payment.user_id == current_user.id
        )
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment


# ========== Helper Functions ==========

def _activate_enrollment(payment: Payment, db: Session):
    """
    Activate enrollment after successful payment.
    Callers are responsible for calling db.commit() after this function.
    """
    # Normalize payment_type – SQLAlchemy returns enum member; compare .value to be safe
    pt_value = payment.payment_type.value if hasattr(payment.payment_type, 'value') else payment.payment_type

    if pt_value == PaymentType.COURSE.value and payment.course_id:
        # ---- Course enrollment ----
        enrollment = db.query(CourseEnrollment).filter(
            and_(
                CourseEnrollment.user_id == payment.user_id,
                CourseEnrollment.course_id == payment.course_id
            )
        ).first()

        if not enrollment:
            enrollment = CourseEnrollment(
                user_id=payment.user_id,
                course_id=payment.course_id,
                payment_id=payment.id,
                status=EnrollmentStatus.ACTIVE
            )
            db.add(enrollment)
        else:
            enrollment.status = EnrollmentStatus.ACTIVE
            enrollment.payment_id = payment.id

        # Also create ExamEnrollment for every existing published exam in this course
        # so that exam-level checks requiring ExamEnrollment also pass immediately.
        existing_exams = db.query(Exam).filter(
            and_(
                Exam.course_id == payment.course_id,
                Exam.is_published == True
            )
        ).all()

        for exam in existing_exams:
            exam_enrollment = db.query(ExamEnrollment).filter(
                and_(
                    ExamEnrollment.user_id == payment.user_id,
                    ExamEnrollment.exam_id == exam.id
                )
            ).first()
            if not exam_enrollment:
                exam_enrollment = ExamEnrollment(
                    user_id=payment.user_id,
                    exam_id=exam.id,
                    payment_id=payment.id,
                    status=EnrollmentStatus.ACTIVE
                )
                db.add(exam_enrollment)
            else:
                exam_enrollment.status = EnrollmentStatus.ACTIVE
                exam_enrollment.payment_id = payment.id

    elif pt_value == PaymentType.EXAM.value and payment.exam_id:
        # ---- Standalone exam enrollment ----
        exam_enrollment = db.query(ExamEnrollment).filter(
            and_(
                ExamEnrollment.user_id == payment.user_id,
                ExamEnrollment.exam_id == payment.exam_id
            )
        ).first()

        if not exam_enrollment:
            exam_enrollment = ExamEnrollment(
                user_id=payment.user_id,
                exam_id=payment.exam_id,
                payment_id=payment.id,
                status=EnrollmentStatus.ACTIVE
            )
            db.add(exam_enrollment)
        else:
            exam_enrollment.status = EnrollmentStatus.ACTIVE
            exam_enrollment.payment_id = payment.id

    # NOTE: db.commit() is intentionally NOT called here.
    # The caller owns the transaction and must commit after this function.
