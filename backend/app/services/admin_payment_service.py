from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.payment import Payment, BankSlip, PaymentStatus, BankSlipStatus
from app.schemas.payment import BankSlipVerification
from app.services.payment_service import PaymentService

class AdminPaymentService:
    def __init__(self, db: Session):
        self.db = db

    def get_pending_bank_slips(self) -> List[BankSlip]:
        return self.db.query(BankSlip).filter(
            BankSlip.status == BankSlipStatus.PENDING.value
        ).order_by(desc(BankSlip.created_at)).all()

    def get_all_bank_slips(self, status_filter: Optional[str] = None) -> List[BankSlip]:
        query = self.db.query(BankSlip)
        if status_filter:
            query = query.filter(BankSlip.status == status_filter)
        return query.order_by(desc(BankSlip.created_at)).all()

    def get_bank_slip_details(self, slip_id: UUID) -> BankSlip:
        slip = self.db.query(BankSlip).filter(BankSlip.id == slip_id).first()
        if not slip:
            raise HTTPException(status_code=404, detail="Bank slip not found")
        return slip

    def verify_bank_slip(self, slip_id: UUID, verification: BankSlipVerification, admin: User) -> BankSlip:
        try:
            slip = self.db.query(BankSlip).filter(BankSlip.id == slip_id).first()
            if not slip:
                raise HTTPException(status_code=404, detail="Bank slip not found")
            
            slip_status = slip.status.value if hasattr(slip.status, 'value') else slip.status
            
            if slip_status != BankSlipStatus.PENDING.value:
                raise HTTPException(status_code=400, detail=f"Bank slip already processed. Current status: {slip_status}")
            
            if verification.status == "verified":
                slip.status = BankSlipStatus.VERIFIED.value
                slip.verified_by = admin.id
                slip.verified_at = datetime.utcnow()
                
                payment = self.db.query(Payment).filter(Payment.id == slip.payment_id).first()
                if payment:
                    payment.status = PaymentStatus.COMPLETED.value
                    payment.completed_at = datetime.utcnow()
                    
                    payment_service = PaymentService(self.db)
                    payment_service._activate_enrollment(payment)
            
            elif verification.status == "rejected":
                slip.status = BankSlipStatus.REJECTED.value
                slip.verified_by = admin.id
                slip.verified_at = datetime.utcnow()
                slip.rejection_reason = verification.rejection_reason
                
                payment = self.db.query(Payment).filter(Payment.id == slip.payment_id).first()
                if payment:
                    payment.status = PaymentStatus.FAILED.value
            
            self.db.commit()
            self.db.refresh(slip)
            return slip
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            print(f"Error verifying bank slip: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error processing bank slip: {str(e)}")

    def get_all_payments(self, status_filter: Optional[str] = None, payment_method: Optional[str] = None) -> List[Payment]:
        query = self.db.query(Payment)
        if status_filter:
            query = query.filter(Payment.status == status_filter)
        if payment_method:
            query = query.filter(Payment.payment_method == payment_method)
        return query.order_by(desc(Payment.created_at)).all()

    def get_payment_statistics(self) -> dict:
        total_payments = self.db.query(Payment).count()
        completed_payments = self.db.query(Payment).filter(Payment.status == PaymentStatus.COMPLETED.value).count()
        pending_payments = self.db.query(Payment).filter(Payment.status == PaymentStatus.PENDING.value).count()
        
        pending_slips = self.db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.PENDING.value).count()
        verified_slips = self.db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.VERIFIED.value).count()
        rejected_slips = self.db.query(BankSlip).filter(BankSlip.status == BankSlipStatus.REJECTED.value).count()
        
        from sqlalchemy import func
        total_revenue = self.db.query(func.sum(Payment.amount)).filter(
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
