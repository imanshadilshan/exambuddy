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
from app.api.v1.payment import _activate_enrollment

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
    slips = db.query(BankSlip).filter(
        BankSlip.status == BankSlipStatus.PENDING.value
    ).order_by(desc(BankSlip.created_at)).all()
    
    return slips


@router.get("/all-slips", response_model=List[BankSlipResponse])
def get_all_bank_slips(
    status_filter: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all bank slips with optional status filter"""
    query = db.query(BankSlip)
    
    if status_filter:
        query = query.filter(BankSlip.status == status_filter)
    
    slips = query.order_by(desc(BankSlip.created_at)).all()
    return slips


@router.get("/slip/{slip_id}", response_model=BankSlipResponse)
def get_bank_slip_details(
    slip_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get detailed bank slip information"""
    slip = db.query(BankSlip).filter(BankSlip.id == slip_id).first()
    if not slip:
        raise HTTPException(status_code=404, detail="Bank slip not found")
    
    return slip


@router.post("/verify-slip/{slip_id}", response_model=BankSlipResponse)
def verify_bank_slip(
    slip_id: UUID,
    verification: BankSlipVerification,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Verify or reject a bank slip"""
    try:
        slip = db.query(BankSlip).filter(BankSlip.id == slip_id).first()
        if not slip:
            raise HTTPException(status_code=404, detail="Bank slip not found")
        
        # Get the string value of status (handle both enum and string)
        slip_status = slip.status.value if hasattr(slip.status, 'value') else slip.status
        
        if slip_status != BankSlipStatus.PENDING.value:
            raise HTTPException(status_code=400, detail=f"Bank slip already processed. Current status: {slip_status}")
        
        # Update bank slip status
        if verification.status == "verified":
            slip.status = BankSlipStatus.VERIFIED.value
            slip.verified_by = admin.id
            slip.verified_at = datetime.utcnow()
            
            # Update payment status and activate enrollment
            payment = db.query(Payment).filter(Payment.id == slip.payment_id).first()
            if payment:
                payment.status = PaymentStatus.COMPLETED.value
                payment.completed_at = datetime.utcnow()
                
                # Activate the enrollment
                _activate_enrollment(payment, db)
        
        elif verification.status == "rejected":
            slip.status = BankSlipStatus.REJECTED.value
            slip.verified_by = admin.id
            slip.verified_at = datetime.utcnow()
            slip.rejection_reason = verification.rejection_reason
            
            # Update payment status
            payment = db.query(Payment).filter(Payment.id == slip.payment_id).first()
            if payment:
                payment.status = PaymentStatus.FAILED.value
        
        db.commit()
        db.refresh(slip)
        
        return slip
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error verifying bank slip: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing bank slip: {str(e)}")


@router.get("/all-payments", response_model=List[PaymentResponse])
def get_all_payments(
    status_filter: Optional[str] = None,
    payment_method: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all payments with optional filters"""
    query = db.query(Payment)
    
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    
    if payment_method:
        query = query.filter(Payment.payment_method == payment_method)
    
    payments = query.order_by(desc(Payment.created_at)).all()
    return payments


@router.get("/payment-stats")
def get_payment_statistics(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get payment statistics for admin dashboard"""
    total_payments = db.query(Payment).count()
    completed_payments = db.query(Payment).filter(Payment.status == PaymentStatus.COMPLETED.value).count()
    pending_payments = db.query(Payment).filter(Payment.status == PaymentStatus.PENDING.value).count()
    
    pending_slips = db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.PENDING.value).count()
    verified_slips = db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.VERIFIED.value).count()
    rejected_slips = db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.REJECTED.value).count()
    
    # Calculate total revenue
    from sqlalchemy import func
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED.value
    ).scalar() or 0
    
    return {
        "total_payments": total_payments,
        "completed_payments": completed_payments,
        "pending_payments": pending_payments,
        "total_revenue": total_revenue,
        "bank_slips": {
            "pending": pending_slips,
            "verified": verified_slips,
            "rejected": rejected_slips
        }
    }
