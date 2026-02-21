"""
Authentication API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.schemas.auth import UserLogin, StudentRegister, Token
from app.schemas.user import UserResponse
from app.schemas.student import StudentResponse
from app.models.user import User, UserRole
from app.models.student import Student
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token
)
from app.dependencies import get_current_user

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
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == student_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=student_data.email,
        password_hash=get_password_hash(student_data.password),
        role=UserRole.STUDENT,
        is_active=False,  # Inactive until payment verified
        is_verified=False
    )
    db.add(user)
    db.flush()  # Get user ID
    
    # Create student profile
    student = Student(
        user_id=user.id,
        full_name=student_data.full_name,
        phone_number=student_data.phone_number,
        school=student_data.school,
        district=student_data.district,
        grade=student_data.grade,
        has_paid=False
    )
    db.add(student)
    db.commit()
    db.refresh(user)
    db.refresh(student)
    
    return {
        "message": "Registration successful! Please complete payment to activate your account.",
        "user_id": str(user.id),
        "email": user.email,
        "next_step": "payment"
    }


@router.post("/login", response_model=Token)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login user and return JWT tokens
    
    - Validates email and password
    - Returns access token and refresh token
    - Updates last login timestamp
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account not activated. Please complete payment to activate your account.",
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=dict)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current logged-in user information
    
    - Returns user details and profile (student or admin)
    - Requires valid access token
    """
    user_data = {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at
    }
    
    # Add role-specific data
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if student:
            user_data["profile"] = {
                "id": str(student.id),
                "full_name": student.full_name,
                "phone_number": student.phone_number,
                "school": student.school,
                "district": student.district,
                "grade": student.grade,
                "profile_photo_url": student.profile_photo_url,
                "has_paid": student.has_paid,
                "payment_verified_at": student.payment_verified_at
            }
    
    return user_data


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user
    
    - Client should discard tokens
    - In future, can add token blacklist
    """
    return {"message": "Successfully logged out"}
