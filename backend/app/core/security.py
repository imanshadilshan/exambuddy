"""
Security utilities for password hashing and JWT tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
import bcrypt

from app.config import settings


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    
    Args:
        data: Dictionary of data to encode in token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, remember_me: bool = False) -> str:
    """
    Create JWT refresh token
    
    Args:
        data: Dictionary of data to encode in token
        remember_me: If True, token lasts 30 days instead of the default
        
    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    days = 30 if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    expire = datetime.utcnow() + timedelta(days=days)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_password_reset_token(email: str) -> str:
    """
    Create a short-lived JWT for password reset (1 hour).
    
    Args:
        email: The email address to encode
    
    Returns:
        Signed JWT reset token
    """
    expire = datetime.utcnow() + timedelta(hours=1)
    data = {"sub": email, "exp": expire, "type": "reset"}
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset JWT and return the email, or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    Verify and decode JWT token
    
    Args:
        token: JWT token to verify
        token_type: Type of token ('access' or 'refresh')
        
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        # Verify token type
        if payload.get("type") != token_type:
            return None
            
        return payload
    except JWTError:
        return None
