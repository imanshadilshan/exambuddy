from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token
)
from app.core.cache import cache
from app.core.session import session_manager
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.admin import Admin
from app.schemas.auth import StudentRegister, UserLogin
from app.api.v1.auth import ProfileUpdateRequest, PasswordChangeRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_student(self, student_data: StudentRegister) -> dict:
        existing_user = self.db.query(User).filter(User.email == student_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        user = User(
            email=student_data.email,
            password_hash=get_password_hash(student_data.password),
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=False
        )
        self.db.add(user)
        self.db.flush()
        
        student = Student(
            user_id=user.id,
            full_name=student_data.full_name,
            phone_number=student_data.phone_number,
            school=student_data.school,
            district=student_data.district,
            grade=student_data.grade,
            has_paid=False
        )
        self.db.add(student)
        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(student)
        
        return {
            "message": "Registration successful! You can now login and browse. Payment is required to take exams.",
            "user_id": str(user.id),
            "email": user.email,
            "next_step": "login"
        }

    async def login(self, credentials: UserLogin) -> dict:
        user = self.db.query(User).filter(User.email == credentials.email).first()
        
        if not user or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support."
            )
        
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        try:
            await session_manager.create_session(
                user_id=str(user.id),
                session_data={
                    "email": user.email,
                    "role": user.role.value,
                    "login_time": datetime.utcnow().isoformat()
                }
            )
            await session_manager.set_user_active(str(user.id))
        except Exception as e:
            print(f"Redis session creation failed: {e}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    async def get_current_user_info(self, current_user: User) -> dict:
        cache_key = f"user_profile:{current_user.id}"
        cached_data = await cache.get(cache_key)
        
        if cached_data:
            await session_manager.set_user_active(str(current_user.id))
            return cached_data
        
        user_data = {
            "id": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role.value,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
            "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
        
        if current_user.role == UserRole.STUDENT:
            student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
            if student:
                user_data["profile"] = {
                    "id": str(student.id),
                    "full_name": student.full_name,
                    "phone_number": student.phone_number,
                    "school": student.school,
                    "district": student.district,
                    "grade": student.grade,
                    "profile_photo_url": student.profile_photo_url,
                    "profile_photo_public_id": student.profile_photo_public_id,
                    "has_paid": student.has_paid,
                    "payment_verified_at": student.payment_verified_at.isoformat() if student.payment_verified_at else None
                }
        elif current_user.role == UserRole.ADMIN:
            admin = self.db.query(Admin).filter(Admin.user_id == current_user.id).first()
            if admin:
                user_data["profile"] = {
                    "id": str(admin.id),
                    "full_name": admin.full_name,
                    "permissions": admin.permissions or {},
                    "created_at": admin.created_at.isoformat() if admin.created_at else None
                }
        
        try:
            await cache.set(cache_key, user_data, expire=300)
        except Exception as e:
            print(f"Cache set failed: {e}")
        
        try:
            await session_manager.set_user_active(str(current_user.id))
        except Exception as e:
            print(f"Set user active failed: {e}")
        
        return user_data

    async def logout(self, current_user: User):
        try:
            await session_manager.delete_user_sessions(str(current_user.id))
            await cache.delete(f"user_profile:{current_user.id}")
        except Exception as e:
            print(f"Logout cleanup failed: {e}")
        
        return {"message": "Successfully logged out"}

    async def update_profile(self, profile_data: ProfileUpdateRequest, current_user: User) -> dict:
        if current_user.role == UserRole.STUDENT:
            student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
            if not student:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
            if profile_data.full_name is not None:
                student.full_name = profile_data.full_name
            if profile_data.phone_number is not None:
                student.phone_number = profile_data.phone_number
            if profile_data.school is not None:
                student.school = profile_data.school
            if profile_data.district is not None:
                student.district = profile_data.district
            if profile_data.grade is not None:
                student.grade = profile_data.grade
            self.db.commit()
        elif current_user.role == UserRole.ADMIN:
            admin = self.db.query(Admin).filter(Admin.user_id == current_user.id).first()
            if not admin:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
            if profile_data.full_name is not None:
                admin.full_name = profile_data.full_name
            self.db.commit()

        try:
            await cache.delete(f"user_profile:{current_user.id}")
        except Exception:
            pass

        return {"message": "Profile updated successfully"}

    def change_password(self, request: PasswordChangeRequest, current_user: User) -> dict:
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )

        current_user.password_hash = get_password_hash(request.new_password)
        self.db.commit()

        return {"message": "Password updated successfully"}
