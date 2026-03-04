"""
Authentication API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.database import get_db
from app.schemas.auth import (
    UserLogin, StudentRegister, Token,
    ForgotPasswordRequest, ResetPasswordRequest, SetPasswordRequest,
    ProfileUpdateRequest, PasswordChangeRequest, CompleteGoogleProfileRequest,
)
from app.schemas.user import UserResponse
from app.models.user import User

from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.cache import cache
from app.core.session import session_manager
from app.dependencies import get_current_user
from app.services.auth_service import AuthService


class GoogleLoginRequest(BaseModel):
    id_token: str


router = APIRouter()


# ── Existing Routes (unchanged) ───────────────────────────────────────────────

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_student(
    student_data: StudentRegister,
    db: Session = Depends(get_db)
):
    """Register a new student account."""
    service = AuthService(db)
    return service.register_student(student_data)


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email + password.
    Pass `remember_me: true` for a 30-day refresh token (stored in localStorage by the client).
    """
    service = AuthService(db)
    return await service.login(credentials)


@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current logged-in user information.
    Returns `auth_provider` and `has_password` among other fields.
    """
    service = AuthService(db)
    return await service.get_current_user_info(current_user)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout — invalidates Redis session."""
    service = AuthService(db)
    return await service.logout(current_user)


@router.put("/profile")
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile fields."""
    service = AuthService(db)
    return await service.update_profile(profile_data, current_user)


@router.post("/google", response_model=dict)
async def google_login(
    body: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate with a Google ID token."""
    service = AuthService(db)
    return await service.google_login(body.id_token)


@router.put("/complete-google-profile", response_model=dict)
def complete_google_profile(
    body: CompleteGoogleProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One-time step for new Google users to finish their student profile."""
    service = AuthService(db)
    return service.complete_google_profile(body, current_user)


@router.put("/password")
def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password (requires existing password)."""
    service = AuthService(db)
    return service.change_password(request, current_user)


# ── New Password Management Routes ────────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset email.
    Always returns HTTP 200 — never reveals whether the email is registered.
    """
    service = AuthService(db)
    return service.forgot_password(request)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using the signed JWT token from the reset email.
    Token expires after 1 hour.
    """
    service = AuthService(db)
    return service.reset_password(request)


@router.post("/set-password", status_code=status.HTTP_200_OK)
def set_password(
    request: SetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set a password for the first time (Google-only accounts with no existing password).
    Enables login with both Google and email+password afterwards.
    """
    service = AuthService(db)
    return service.set_password(request, current_user)
