"""
FastAPI Dependencies

Authentication & Authorization Flow:
- get_current_user: Validates JWT token (all authenticated endpoints)
- get_current_student: Requires user to be a student role
- get_current_admin: Requires user to be an admin role
- require_payment: Requires student to have paid (USE ONLY for exam-taking endpoints)

Usage Examples:
    # Any authenticated user
    @router.get("/profile")
    def get_profile(user: User = Depends(get_current_user)):
        ...
    
    # Student-only endpoint (browsing, viewing)
    @router.get("/papers")
    def list_papers(user: User = Depends(get_current_student)):
        ...
    
    # Paid student-only endpoint (taking exams)
    @router.post("/papers/{paper_id}/submit")
    def submit_exam(user: User = Depends(require_payment)):
        ...
"""
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.core.security import verify_token
from app.models.user import User, UserRole


# Security scheme
security = HTTPBearer()

def get_optional_user(request: Request, db: Session) -> Optional[User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return None

    payload = verify_token(token, token_type="access")
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    return db.query(User).filter(User.id == user_id).first()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP bearer credentials
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Extract token
    token = credentials.credentials
    
    # Verify token
    payload = verify_token(token, token_type="access")
    if payload is None:
        raise credentials_exception
    
    # Get user ID from token
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    # Get user from database with student relationship explicitly loaded to prevent N+1 queries later
    user = db.query(User).options(joinedload(User.student)).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support."
        )
    
    return user


def get_current_student(current_user: User = Depends(get_current_user)) -> User:
    """
    Require current user to be a student
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user (verified as student)
        
    Raises:
        HTTPException: If user is not a student
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this resource"
        )
    return current_user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Require current user to be an admin
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Current user (verified as admin)
        
    Raises:
        HTTPException: If user is not an admin
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this resource"
        )
    return current_user


def require_payment(
    current_user: User = Depends(get_current_student),
    db: Session = Depends(get_db)
) -> User:
    """
    Require student to have completed payment
    Use this dependency ONLY for exam-taking endpoints
    
    Args:
        current_user: Current authenticated student
        db: Database session
        
    Returns:
        Current user (verified as paid student)
        
    Raises:
        HTTPException: If student hasn't paid
    """
    if not current_user.student or not current_user.student.has_paid:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Payment required to take exams. Please complete payment to access this feature."
        )
    return current_user
