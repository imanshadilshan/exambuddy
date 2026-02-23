"""
Payment Models - Payments and Bank Slips
"""
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Enum as SQLEnum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PaymentMethod(enum.Enum):
    """Payment method enum"""
    PAYHERE = "payhere"
    BANK_SLIP = "bank_slip"
    FREE = "free"


class PaymentStatus(enum.Enum):
    """Payment status enum"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentType(enum.Enum):
    """Payment type enum"""
    COURSE = "course"
    EXAM = "exam"


def enum_values(enum_cls):
    return [member.value for member in enum_cls]


class Payment(Base):
    """Payment transaction record"""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # What was purchased
    payment_type = Column(
        SQLEnum(PaymentType, values_callable=enum_values, name="payment_type"),
        nullable=False,
    )
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="SET NULL"), nullable=True)
    
    # Payment details
    amount = Column(Integer, nullable=False)  # Amount in LKR
    payment_method = Column(
        SQLEnum(PaymentMethod, values_callable=enum_values, name="payment_method"),
        nullable=False,
    )
    status = Column(
        SQLEnum(PaymentStatus, values_callable=enum_values, name="payment_status"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    
    # PayHere specific
    payhere_order_id = Column(String, nullable=True, index=True)
    payhere_payment_id = Column(String, nullable=True)
    
    # Metadata
    transaction_data = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="payments")
    course = relationship("Course", backref="payments")
    exam = relationship("Exam", backref="payments")


class BankSlipStatus(enum.Enum):
    """Bank slip verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class BankSlip(Base):
    """Bank slip uploads for manual verification"""
    __tablename__ = "bank_slips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Bank slip details
    slip_image_url = Column(String, nullable=False)
    slip_image_public_id = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    depositor_name = Column(String, nullable=True)
    deposit_date = Column(DateTime(timezone=True), nullable=True)
    reference_number = Column(String, nullable=True)
    
    # Verification
    status = Column(
        SQLEnum(BankSlipStatus, values_callable=enum_values, name="bank_slip_status"),
        default=BankSlipStatus.PENDING,
        nullable=False,
    )
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    payment = relationship("Payment", backref="bank_slip")
    user = relationship("User", foreign_keys=[user_id], backref="bank_slips")
    verifier = relationship("User", foreign_keys=[verified_by], backref="verified_bank_slips")
