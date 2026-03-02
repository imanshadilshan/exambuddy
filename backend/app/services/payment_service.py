import hashlib
import json
import os
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.models.student import Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.payment import Payment, PaymentType, PaymentMethod, PaymentStatus, BankSlip, BankSlipStatus
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.schemas.payment import PaymentCreate
from app.config import settings

PAYHERE_MERCHANT_ID = os.getenv("PAYHERE_MERCHANT_ID", "")
PAYHERE_MERCHANT_SECRET = os.getenv("PAYHERE_MERCHANT_SECRET", "")
PAYHERE_SANDBOX = os.getenv("PAYHERE_SANDBOX", "True").lower() == "true"


class PaymentService:
    def __init__(self, db: Session):
        self.db = db

    def initiate_payment(self, payment_data: PaymentCreate, current_user: User) -> Payment:
        student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=403, detail="Only students can make payments")

        amount = 0
        course = None
        exam = None

        if payment_data.payment_type == "course":
            if not payment_data.course_id:
                raise HTTPException(status_code=400, detail="course_id required for course payment")
            course = self.db.query(Course).filter(Course.id == payment_data.course_id).first()
            if not course:
                raise HTTPException(status_code=404, detail="Course not found")
            amount = course.price

            existing = self.db.query(CourseEnrollment).filter(
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
            exam = self.db.query(Exam).filter(Exam.id == payment_data.exam_id).first()
            if not exam:
                raise HTTPException(status_code=404, detail="Exam not found")
            amount = exam.price

            existing = self.db.query(ExamEnrollment).filter(
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

        payment = Payment(
            user_id=current_user.id,
            payment_type=payment_data.payment_type,
            course_id=payment_data.course_id,
            exam_id=payment_data.exam_id,
            amount=amount,
            payment_method=payment_data.payment_method,
            status=PaymentStatus.PENDING.value
        )

        if payment_data.payment_method == "payhere":
            # Temporary save to get ID
            self.db.add(payment)
            self.db.flush()
            payment.payhere_order_id = f"EB_{payment.id}"

        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)

        return payment

    def get_payhere_config(self, payment_id: UUID, current_user: User) -> dict:
        payment = self.db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id
            )
        ).first()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        pm_value = payment.payment_method.value if hasattr(payment.payment_method, 'value') else payment.payment_method
        if pm_value != PaymentMethod.PAYHERE.value:
            raise HTTPException(status_code=400, detail="Payment method is not PayHere")

        pt_value = payment.payment_type.value if hasattr(payment.payment_type, 'value') else payment.payment_type
        item_name = "ExamBuddy Enrollment"
        if pt_value == PaymentType.COURSE.value and payment.course:
            item_name = f"Course: {payment.course.title}"
        elif pt_value == PaymentType.EXAM.value and payment.exam:
            item_name = f"Exam: {payment.exam.title}"

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

    def payhere_notify(self, merchant_id: str, order_id: str, payhere_amount: str, payhere_currency: str, status_code: str, md5sig: str, payment_id: str, custom_1: str, custom_2: str):
        merchant_secret_hash = hashlib.md5(PAYHERE_MERCHANT_SECRET.encode()).hexdigest().upper()
        local_hash_string = f"{merchant_id}{order_id}{payhere_amount}{payhere_currency}{status_code}{merchant_secret_hash}"
        local_hash = hashlib.md5(local_hash_string.encode()).hexdigest().upper()

        if local_hash != md5sig:
            raise HTTPException(status_code=400, detail="Invalid hash signature")

        payment = self.db.query(Payment).filter(Payment.payhere_order_id == order_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if status_code == "2":
            payment.status = PaymentStatus.COMPLETED.value
            payment.completed_at = datetime.utcnow()
            payment.payhere_payment_id = payment_id
            self._activate_enrollment(payment)

        elif status_code in ["-1", "-2"]:
            payment.status = PaymentStatus.FAILED.value
        elif status_code == "-3":
            payment.status = PaymentStatus.REFUNDED.value

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
        self.db.commit()

        return {"status": "ok"}

    async def upload_bank_slip(self, payment_id: UUID, current_user: User, slip_image: UploadFile, bank_name: Optional[str] = None, depositor_name: Optional[str] = None, deposit_date: Optional[str] = None, reference_number: Optional[str] = None) -> BankSlip:
        payment = self.db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id,
                Payment.payment_method == PaymentMethod.BANK_SLIP.value
            )
        ).first()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        existing_slip = self.db.query(BankSlip).filter(BankSlip.payment_id == payment_id).first()
        if existing_slip:
            raise HTTPException(status_code=400, detail="Bank slip already uploaded for this payment")

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

        self.db.add(bank_slip)
        self.db.commit()
        self.db.refresh(bank_slip)

        return bank_slip

    def get_my_payments(self, current_user: User) -> List[Payment]:
        return self.db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.created_at.desc()).all()

    def get_payment_details(self, payment_id: UUID, current_user: User) -> Payment:
        payment = self.db.query(Payment).filter(
            and_(
                Payment.id == payment_id,
                Payment.user_id == current_user.id
            )
        ).first()

        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        return payment

    def _activate_enrollment(self, payment: Payment):
        pt_value = payment.payment_type.value if hasattr(payment.payment_type, 'value') else payment.payment_type

        if pt_value == PaymentType.COURSE.value and payment.course_id:
            enrollment = self.db.query(CourseEnrollment).filter(
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
                self.db.add(enrollment)
            else:
                enrollment.status = EnrollmentStatus.ACTIVE
                enrollment.payment_id = payment.id

            existing_exams = self.db.query(Exam).filter(
                and_(
                    Exam.course_id == payment.course_id,
                    Exam.is_published == True
                )
            ).all()

            for exam in existing_exams:
                exam_enrollment = self.db.query(ExamEnrollment).filter(
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
                    self.db.add(exam_enrollment)
                else:
                    exam_enrollment.status = EnrollmentStatus.ACTIVE
                    exam_enrollment.payment_id = payment.id

        elif pt_value == PaymentType.EXAM.value and payment.exam_id:
            exam_enrollment = self.db.query(ExamEnrollment).filter(
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
                self.db.add(exam_enrollment)
            else:
                exam_enrollment.status = EnrollmentStatus.ACTIVE
                exam_enrollment.payment_id = payment.id
