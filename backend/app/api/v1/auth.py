"""
Authentication API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.schemas.auth import UserLogin, StudentRegister, Token
from app.schemas.user import UserResponse
from app.schemas.student import StudentResponse
from app.schemas.admin import AdminResponse
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.admin import Admin


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class CompleteGoogleProfileRequest(BaseModel):
    phone_number: str
    school: str
    district: str
    grade: int

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token
)
from app.core.cache import cache
from app.core.session import session_manager
from app.dependencies import get_current_user
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_student(
    student_data: StudentRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new student
    
    - Creates user account and student profile
    - Password is hashed before storage
    - Returns success message (account inactive until payment)
    """
    service = AuthService(db)
    return service.register_student(student_data)


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login user and return JWT tokens
    
    - Validates email and password
    - Returns access token and refresh token
    - Updates last login timestamp
    - Creates Redis session for tracking
    """
    service = AuthService(db)
    return await service.login(credentials)


@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current logged-in user information
    
    - Returns user details and profile (student or admin)
    - Requires valid access token
    - Uses Redis caching for performance
    """
    service = AuthService(db)
    return await service.get_current_user_info(current_user)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    access_token: str = Depends(lambda: None),  # Get token from dependency
    db: Session = Depends(get_db)
):
    """
    Logout user
    
    - Blacklists the access token
    - Deletes user sessions from Redis
    - Client should discard tokens
    """
    service = AuthService(db)
    return await service.logout(current_user)


@router.put("/profile")
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.
    Students can update: full_name, phone_number, school, district, grade.
    Admins can update: full_name.
    """
    service = AuthService(db)
    return await service.update_profile(profile_data, current_user)


@router.post("/google", response_model=dict)
async def google_login(
    body: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate with a Google ID token.
    
    - Verifies the token with Google
    - Creates a new student account if first login
    - Links Google ID to existing account if email already exists
    - Returns JWT tokens + `needs_profile_completion` flag for new users
    """
    service = AuthService(db)
    return await service.google_login(body.id_token)


@router.put("/complete-google-profile", response_model=dict)
def complete_google_profile(
    body: CompleteGoogleProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    One-time step for new Google users to complete their student profile.
    
    Required fields: phone_number, school, district, grade
    After completion, the user is redirected to the student dashboard.
    """
    service = AuthService(db)
    return service.complete_google_profile(body, current_user)



@router.put("/password")
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    Requires the existing password for verification.
    """
    service = AuthService(db)
    result = service.change_password(request, current_user)
    
    # Invalidate user cache
    try:
        import asyncio
        asyncio.create_task(cache.delete(f"user_profile:{current_user.id}"))
    except Exception:
        pass

    return result
