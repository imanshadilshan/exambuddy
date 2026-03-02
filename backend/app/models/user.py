"""
User Model - Base user table for authentication
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    """User role enumeration"""
    STUDENT = "student"
    ADMIN = "admin"


class User(Base):
    """
    User model for authentication
    Base table for both students and admins
    """
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for Google-only accounts
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(String, default="email", nullable=False)  # 'email' | 'google'
    needs_profile_completion = Column(Boolean, default=False)  # True for new Google users
    student = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin = relationship("Admin", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
