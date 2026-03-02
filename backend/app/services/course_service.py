from typing import List, Optional
from uuid import UUID
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.models.course import Course
from app.models.enrollment import CourseEnrollment, EnrollmentStatus
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate
from app.dependencies import get_optional_user

_PLATFORM_STATS_CACHE = {}
_PLATFORM_STATS_CACHE_TIME = 0

class CourseService:
    def __init__(self, db: Session):
        self.db = db

    def list_courses(self
        , grade: Optional[int] = None
        , subject: Optional[str] = None
        , is_active_only: bool = False
    ) -> List[Course]:
        query = self.db.query(Course)
        if is_active_only:
            query = query.filter(Course.is_active == True)
        if grade is not None:
            query = query.filter(Course.grade == grade)
        if subject:
            query = query.filter(Course.subject.ilike(f"%{subject}%"))
        
        return query.order_by(Course.grade.asc(), Course.subject.asc(), Course.title.asc()).all()

    def get_course_with_enrollment_status(self, course_id: UUID, request: Request, current_user: Optional[User] = None):
        course = self.db.query(Course).filter(
            Course.id == course_id, 
            Course.is_active == True
        ).first()
        
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found"
            )

        is_enrolled = False
        user = current_user or get_optional_user(request, self.db)
        if user:
            enrollment = self.db.query(CourseEnrollment).filter(
                CourseEnrollment.user_id == user.id,
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.status == EnrollmentStatus.ACTIVE,
            ).first()
            is_enrolled = enrollment is not None

        return {
            "id": course.id,
            "title": course.title,
            "subject": course.subject,
            "grade": course.grade,
            "image_url": course.image_url,
            "image_public_id": course.image_public_id,
            "price": course.price,
            "description": course.description,
            "is_active": course.is_active,
            "created_at": course.created_at,
            "updated_at": course.updated_at,
            "is_enrolled": is_enrolled,
        }

    def create_course(self, payload: CourseCreate) -> Course:
        course = Course(
            title=payload.title,
            subject=payload.subject,
            grade=payload.grade,
            image_url=payload.image_url,
            image_public_id=payload.image_public_id,
            price=payload.price,
            description=payload.description,
            is_active=True,
        )
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        return course

    def update_course(self, course_id: UUID, payload: CourseUpdate) -> Course:
        course = self.db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(course, field, value)

        self.db.commit()
        self.db.refresh(course)
        return course

    def delete_course(self, course_id: UUID) -> None:
        course = self.db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        self.db.delete(course)
        self.db.commit()

    def get_platform_stats(self) -> dict:
        import time
        global _PLATFORM_STATS_CACHE, _PLATFORM_STATS_CACHE_TIME
        now = time.time()
        if _PLATFORM_STATS_CACHE and (now - _PLATFORM_STATS_CACHE_TIME < 300):
            return _PLATFORM_STATS_CACHE

        from app.models.student import Student
        from app.models.exam import Exam
        from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus
        from sqlalchemy import func

        total_students = self.db.query(func.count(Student.id)).scalar() or 0
        total_courses = self.db.query(func.count(Course.id)).filter(Course.is_active == True).scalar() or 0
        total_exams = self.db.query(func.count(Exam.id)).filter(Exam.is_published == True).scalar() or 0
        total_attempts = (
            self.db.query(func.count(ExamAttempt.id))
            .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
            .scalar() or 0
        )

        # Top 4 courses ordered by enrollment count
        top_courses_q = (
            self.db.query(Course, func.count(CourseEnrollment.id).label("enrollment_count"))
            .outerjoin(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .filter(Course.is_active == True)
            .group_by(Course.id)
            .order_by(func.count(CourseEnrollment.id).desc())
            .limit(4)
            .all()
        )

        stats = {
            "total_students": total_students,
            "total_courses": total_courses,
            "total_exams": total_exams,
            "total_attempts": total_attempts,
            "top_courses": [
                {
                    "id": str(c.id),
                    "title": c.title,
                    "subject": c.subject,
                    "grade": c.grade,
                    "image_url": c.image_url,
                    "price": c.price,
                    "enrollment_count": enrollment_count,
                }
                for c, enrollment_count in top_courses_q
            ],
        }
        
        _PLATFORM_STATS_CACHE = stats
        _PLATFORM_STATS_CACHE_TIME = now
        return stats
