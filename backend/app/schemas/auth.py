"""
Authentication Schemas
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime


class UserLogin(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    remember_me: bool = False


class StudentRegister(BaseModel):
    """Student registration schema"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    confirm_password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=10, max_length=15)
    school: str = Field(..., min_length=2, max_length=200)
    district: str = Field(..., min_length=2, max_length=100)
    grade: int = Field(..., ge=10, le=13, description="Grade must be 10, 11, 12, or 13")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('grade')
    def validate_grade(cls, v):
        if v not in [10, 11, 12, 13]:
            raise ValueError('Grade must be 10, 11, 12, or 13')
        return v


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None


# ── Password Management Schemas ──────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    """Forgot password — request a reset email"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password using a token from the email link"""
    token: str
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")
    confirm_password: str = Field(..., min_length=8)

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class SetPasswordRequest(BaseModel):
    """Set a password for the first time (Google-only accounts)"""
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")
    confirm_password: str = Field(..., min_length=8)

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


# ── Shared request models (used by auth routes + auth service) ────────────────

class ProfileUpdateRequest(BaseModel):
    """Update user profile fields"""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    school: Optional[str] = None
    district: Optional[str] = None
    grade: Optional[int] = None


class PasswordChangeRequest(BaseModel):
    """Change password — requires current password"""
    current_password: str
    new_password: str


class CompleteGoogleProfileRequest(BaseModel):
    """One-time step for new Google users"""
    phone_number: str
    school: str
    district: str
    grade: int

