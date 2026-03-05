"""
Authentication Service
"""
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_password_reset_token,
)
from app.core.cache import cache
from app.core.session import session_manager
from app.core.google_auth import verify_google_token
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.admin import Admin
from app.schemas.auth import (
    StudentRegister, UserLogin,
    ForgotPasswordRequest, ResetPasswordRequest, SetPasswordRequest,
    ProfileUpdateRequest, PasswordChangeRequest, CompleteGoogleProfileRequest,
)
from app.services.email_service import (
    send_password_reset_email,
    send_password_set_notification,
    send_password_changed_notification,
)


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    # ── Existing methods (unchanged) ─────────────────────────────────────────

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

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Google-only accounts have no password
        if user.auth_provider == "google" and not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google Sign-In. Please click 'Continue with Google'."
            )

        if not verify_password(credentials.password, user.password_hash or ""):
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
        refresh_token = create_refresh_token(
            data={"sub": str(user.id)},
            remember_me=credentials.remember_me
        )
        
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

    async def google_login(self, id_token: str) -> dict:
        """Verify Google ID token and return JWT tokens. Creates or retrieves user."""
        google_info = verify_google_token(id_token)
        if not google_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token."
            )

        google_id = google_info["google_id"]
        email = google_info["email"]
        full_name = google_info["full_name"]
        picture = google_info["picture"] or None

        user = self.db.query(User).filter(User.google_id == google_id).first()

        if not user:
            user = self.db.query(User).filter(User.email == email).first()

        needs_profile = False

        if user:
            if not user.google_id:
                user.google_id = google_id
                user.auth_provider = "google"

            if user.student and picture:
                # Only overwrite with Google picture if they haven't uploaded a custom one
                if not user.student.profile_photo_public_id:
                    user.student.profile_photo_url = picture

            user.last_login = datetime.utcnow()
            self.db.commit()
        else:
            user = User(
                email=email,
                password_hash=None,
                role=UserRole.STUDENT,
                is_active=True,
                is_verified=True,
                google_id=google_id,
                auth_provider="google",
                needs_profile_completion=True,
            )
            self.db.add(user)
            self.db.flush()

            student = Student(
                user_id=user.id,
                full_name=full_name or email.split("@")[0],
                phone_number="",
                school="",
                district="",
                grade=11,
                profile_photo_url=picture or None,
                has_paid=False,
            )
            self.db.add(student)
            self.db.commit()
            needs_profile = True

        self.db.refresh(user)

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
            print(f"Redis session creation failed (google login): {e}")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "needs_profile_completion": needs_profile or user.needs_profile_completion,
        }

    def complete_google_profile(
        self,
        data: "CompleteGoogleProfileRequest",
        current_user: User,
    ) -> dict:
        """Finish the one-time profile-completion step for new Google users."""
        student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")

        student.phone_number = data.phone_number
        student.school = data.school
        student.district = data.district
        student.grade = data.grade

        current_user.needs_profile_completion = False
        self.db.commit()

        return {"message": "Profile completed successfully"}

    async def get_current_user_info(self, current_user: User) -> dict:
        cache_key = f"user_profile:{current_user.id}"
        cached_data = await cache.get(cache_key)
        
        if cached_data and "has_password" in cached_data:
            await session_manager.set_user_active(str(current_user.id))
            return cached_data
        
        user_data = {
            "id": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role.value,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
            "auth_provider": current_user.auth_provider,
            "has_password": current_user.password_hash is not None,
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

    async def update_profile_photo(self, file: UploadFile, current_user: User) -> dict:
        if current_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can upload profile photos via this endpoint.")
            
        student = self.db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File provided is not an image.")

        # Import cloudinary here to avoid circular imports if settings change
        import cloudinary
        import cloudinary.uploader
        from app.config import settings
        
        if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY or not settings.CLOUDINARY_API_SECRET:
            raise HTTPException(status_code=500, detail="Cloudinary credentials missing from environment.")

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )

        try:
            # Delete old image if it exists to prevent orphan files
            if student.profile_photo_public_id:
                try:
                    cloudinary.uploader.destroy(student.profile_photo_public_id)
                except Exception as e:
                    print(f"[AuthService] Warning: Failed to delete old profile photo from Cloudinary: {e}")

            # Upload new image
            file_content = await file.read()
            upload_result = cloudinary.uploader.upload(
                file_content,
                folder=f"{settings.CLOUDINARY_FOLDER}/profiles" if hasattr(settings, 'CLOUDINARY_FOLDER') else "exambuddy/profiles",
                resource_type="image",
                transformation=[
                    {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'} # Optimize for avatars
                ]
            )

            # Update database
            student.profile_photo_url = upload_result.get("secure_url")
            student.profile_photo_public_id = upload_result.get("public_id")
            self.db.commit()

            # Clear cache so /auth/me fetches new data
            try:
                await cache.delete(f"user_profile:{current_user.id}")
            except Exception:
                pass

            return {"profile_photo_url": student.profile_photo_url}
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    def change_password(self, request: PasswordChangeRequest, current_user: User) -> dict:
        """Change password — requires current password verification."""
        if not current_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No password set. Use 'Set Password' option."
            )
        if not verify_password(request.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )

        current_user.password_hash = get_password_hash(request.new_password)
        self.db.commit()

        return {"message": "Password updated successfully"}

    # ── New Password Management Methods ──────────────────────────────────────

    def forgot_password(self, request: ForgotPasswordRequest) -> dict:
        """
        Send a password reset email.
        Always returns the same message to prevent user enumeration.
        """
        success_msg = {
            "message": "If an account with that email exists, a reset link has been sent."
        }

        user = self.db.query(User).filter(User.email == request.email).first()
        if not user:
            return success_msg  # Don't reveal whether email exists

        # Generate JWT reset token
        token = create_password_reset_token(user.email)

        # Get user name for email personalisation
        user_name = None
        if user.student:
            user_name = user.student.full_name
        elif user.admin:
            user_name = user.admin.full_name

        try:
            send_password_reset_email(user.email, token, user_name)
        except Exception as e:
            print(f"[AuthService] forgot_password email error: {e}")

        return success_msg

    def reset_password(self, request: ResetPasswordRequest) -> dict:
        """
        Reset the user's password using the token from the reset email.
        The token is a signed JWT — no DB storage needed.
        """
        email = verify_password_reset_token(request.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset link. Please request a new one."
            )

        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )

        user.password_hash = get_password_hash(request.new_password)
        self.db.commit()

        # Notify user
        user_name = None
        if user.student:
            user_name = user.student.full_name
        elif user.admin:
            user_name = user.admin.full_name
        try:
            send_password_changed_notification(user.email, user_name)
        except Exception as e:
            print(f"[AuthService] reset_password notification error: {e}")

        return {"message": "Password reset successfully. You can now log in."}

    def set_password(self, request: SetPasswordRequest, current_user: User) -> dict:
        """
        Set a password for a Google-only account (no existing password).
        After setting, the user can log in with either Google or email+password.
        """
        if current_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A password is already set. Use 'Change Password' instead."
            )

        current_user.password_hash = get_password_hash(request.new_password)
        self.db.commit()

        # Invalidate cache so /auth/me returns updated has_password
        # (fire-and-forget — best effort)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(cache.delete(f"user_profile:{current_user.id}"))
        except Exception:
            pass

        # Notify user
        user_name = None
        if current_user.student:
            user_name = current_user.student.full_name
        elif current_user.admin:
            user_name = current_user.admin.full_name
        try:
            send_password_set_notification(current_user.email, user_name)
        except Exception as e:
            print(f"[AuthService] set_password notification error: {e}")

        return {"message": "Password set successfully. You can now log in with email and password."}
