"""
Student API Routes - Course enrollment and exam access
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from app.schemas.course import CourseResponse
from app.schemas.exam import ExamResponse
from app.schemas.enrollment import CourseEnrollmentResponse, ExamEnrollmentResponse
from app.schemas.payment import PaymentResponse
from app.dependencies import get_current_user
from app.core.security import verify_token

router = APIRouter(prefix="/student", tags=["Student"])


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


@router.get("/courses", response_model=List[CourseResponse])
def get_available_courses(
    db: Session = Depends(get_db)
):
    """Get all active courses available for enrollment"""
    courses = db.query(Course).filter(Course.is_active == True).all()
    return courses


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course_overview(
    course_id: UUID,
    db: Session = Depends(get_db)
):
    """Get course details with enrollment status"""
    course = db.query(Course).filter(Course.id == course_id, Course.is_active == True).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course


@router.get("/courses/{course_id}/exams")
def get_course_exams(
    course_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all exams for a course with enrollment status"""
    current_user = get_optional_user(request, db)

    # Check if user has full course access
    has_course_access = False
    if current_user:
        course_enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.status == EnrollmentStatus.ACTIVE
        ).first()
        has_course_access = course_enrollment is not None

    # Get all exams for the course
    exams = db.query(Exam).filter(
        Exam.course_id == course_id
    ).all()

    result = []
    for exam in exams:
        # Check individual exam enrollment
        exam_enrollment = None
        if current_user:
            exam_enrollment = db.query(ExamEnrollment).filter(
                ExamEnrollment.user_id == current_user.id,
                ExamEnrollment.exam_id == exam.id,
                ExamEnrollment.status == EnrollmentStatus.ACTIVE
            ).first()

        result.append({
            "id": str(exam.id),
            "title": exam.title,
            "description": exam.description,
            "image_url": exam.image_url,
            "duration_minutes": exam.duration_minutes,
            "total_questions": exam.total_questions,
            "price": exam.price,
            "is_free": exam.price == 0,
            "is_enrolled": has_course_access or exam_enrollment is not None,
            "enrollment_type": "course" if has_course_access else ("exam" if exam_enrollment else None)
        })

    return result


@router.post("/exams/{exam_id}/enroll-free")
def enroll_free_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enroll in a free exam (price = 0)"""
    # Get exam
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    if exam.price != 0:
        raise HTTPException(status_code=400, detail="This exam is not free")

    # Check if already enrolled via course
    course_enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.course_id == exam.course_id,
        CourseEnrollment.status == EnrollmentStatus.ACTIVE
    ).first()
    
    if course_enrollment:
        return {"message": "Already enrolled via course", "enrollment_type": "course"}

    # Check if already enrolled in this exam
    existing = db.query(ExamEnrollment).filter(
        ExamEnrollment.user_id == current_user.id,
        ExamEnrollment.exam_id == exam_id,
        ExamEnrollment.status == EnrollmentStatus.ACTIVE
    ).first()
    
    if existing:
        return {"message": "Already enrolled", "enrollment_id": str(existing.id)}

    # Create free enrollment (no payment needed)
    enrollment = ExamEnrollment(
        user_id=current_user.id,
        exam_id=exam_id,
        status=EnrollmentStatus.ACTIVE
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {
        "message": "Successfully enrolled in free exam",
        "enrollment_id": str(enrollment.id)
    }


@router.get("/my-enrollments")
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's course and exam enrollments"""
    # Get course enrollments with course details
    course_enrollments = db.query(CourseEnrollment).options(
        joinedload(CourseEnrollment.course)
    ).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.status == EnrollmentStatus.ACTIVE
    ).all()

    # Get exam enrollments with exam details
    exam_enrollments = db.query(ExamEnrollment).options(
        joinedload(ExamEnrollment.exam)
    ).filter(
        ExamEnrollment.user_id == current_user.id,
        ExamEnrollment.status == EnrollmentStatus.ACTIVE
    ).all()

    return {
        "courses": [
            {
                "enrollment_id": str(e.id),
                "course": {
                    "id": str(e.course.id),
                    "title": e.course.title,
                    "subject": e.course.subject,
                    "grade": e.course.grade,
                    "image_url": e.course.image_url,
                    "price": e.course.price
                },
                "enrolled_at": e.enrolled_at
            }
            for e in course_enrollments
        ],
        "exams": [
            {
                "enrollment_id": str(e.id),
                "exam": {
                    "id": str(e.exam.id),
                    "title": e.exam.title,
                    "duration_minutes": e.exam.duration_minutes,
                    "total_questions": e.exam.total_questions,
                    "image_url": e.exam.image_url,
                    "price": e.exam.price
                },
                "enrolled_at": e.enrolled_at
            }
            for e in exam_enrollments
        ]
    }


@router.get("/check-access/{exam_id}")
def check_exam_access(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user has access to an exam"""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Check course enrollment
    course_enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.course_id == exam.course_id,
        CourseEnrollment.status == EnrollmentStatus.ACTIVE
    ).first()

    # Check exam enrollment
    exam_enrollment = db.query(ExamEnrollment).filter(
        ExamEnrollment.user_id == current_user.id,
        ExamEnrollment.exam_id == exam_id,
        ExamEnrollment.status == EnrollmentStatus.ACTIVE
    ).first()

    has_access = course_enrollment is not None or exam_enrollment is not None

    return {
        "has_access": has_access,
        "access_type": "course" if course_enrollment else ("exam" if exam_enrollment else None),
        "exam": {
            "id": str(exam.id),
            "title": exam.title,
            "price": exam.price,
            "is_free": exam.price == 0
        }
    }
