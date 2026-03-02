"""
Admin Payment API Endpoints - Bank Slip Review & Payment Management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.payment import Payment, BankSlip, PaymentStatus, BankSlipStatus
from app.schemas.payment import PaymentResponse, BankSlipResponse, BankSlipVerification
from app.api.v1.auth import get_current_user
from app.services.admin_payment_service import AdminPaymentService

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/pending-slips", response_model=List[BankSlipResponse])
def get_pending_bank_slips(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all pending bank slips for review"""
    service = AdminPaymentService(db)
    return service.get_pending_bank_slips()


@router.get("/all-slips", response_model=List[BankSlipResponse])
def get_all_bank_slips(
    status_filter: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all bank slips with optional status filter"""
    service = AdminPaymentService(db)
    return service.get_all_bank_slips(status_filter)


@router.get("/slip/{slip_id}", response_model=BankSlipResponse)
def get_bank_slip_details(
    slip_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get detailed bank slip information"""
    service = AdminPaymentService(db)
    return service.get_bank_slip_details(slip_id)


@router.post("/verify-slip/{slip_id}", response_model=BankSlipResponse)
def verify_bank_slip(
    slip_id: UUID,
    verification: BankSlipVerification,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Verify or reject a bank slip"""
    service = AdminPaymentService(db)
    return service.verify_bank_slip(slip_id, verification, admin)


@router.get("/all-payments", response_model=List[PaymentResponse])
def get_all_payments(
    status_filter: Optional[str] = None,
    payment_method: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all payments with optional filters"""
    service = AdminPaymentService(db)
    return service.get_all_payments(status_filter, payment_method)


@router.get("/payment-stats")
def get_payment_statistics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get payment statistics for admin dashboard"""
    service = AdminPaymentService(db)
    return service.get_payment_statistics()
