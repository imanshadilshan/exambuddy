"""
API v1 Router
"""
from fastapi import APIRouter
from app.api.v1 import auth, admin_content, student, payment, admin_payment

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admin_content.router, prefix="/admin", tags=["Admin Content"])
api_router.include_router(student.router, tags=["Student"])
api_router.include_router(payment.router, prefix="/payment", tags=["Payment"])
api_router.include_router(admin_payment.router, prefix="/admin/payment", tags=["Admin Payment"])
