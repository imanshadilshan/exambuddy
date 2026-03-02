"""
Student API Routes - Course enrollment and exam access
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.user import User
from app.schemas.course import CourseResponse
from app.schemas.exam import ExamResponse
from app.schemas.exam_engine import (
    StartExamResponse,
    SubmitExamRequest,
    SubmitExamResponse,
    SubjectRankResponse,
)
from app.dependencies import get_current_user, get_optional_user
from app.core.security import verify_token
from app.services.course_service import CourseService
from app.services.exam_service import ExamService
from app.services.student_service import StudentService

router = APIRouter(prefix="/student", tags=["Student"])





@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    """Public platform-wide statistics for the homepage."""
    service = CourseService(db)
    return service.get_platform_stats()


@router.get("/courses", response_model=List[CourseResponse])
def get_available_courses(
    db: Session = Depends(get_db)
):
    """Get all active courses available for enrollment"""
    service = CourseService(db)
    return service.list_courses(is_active_only=True)


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course_overview(
    course_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get course details with enrollment status"""
    service = CourseService(db)
    return service.get_course_with_enrollment_status(course_id, request)


@router.get("/courses/{course_id}/exams")
def get_course_exams(
    course_id: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all exams for a course with enrollment status"""
    service = ExamService(db)
    return service.get_course_exams_with_enrollment(course_id, request)


@router.post("/exams/{exam_id}/enroll-free")
def enroll_free_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enroll in a free exam (price = 0)"""
    service = StudentService(db)
    return service.enroll_free_exam(exam_id, current_user)


@router.get("/my-enrollments")
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's course and exam enrollments"""
    service = StudentService(db)
    return service.get_my_enrollments(current_user)


@router.get("/check-access/{exam_id}")
def check_exam_access(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user has access to an exam"""
    service = ExamService(db)
    return service.check_exam_access(exam_id, current_user)


def _compute_subject_ranks(db: Session, user_id: UUID, subject: str, district: Optional[str]):
    from app.models.user import User
    from app.models.student import Student
    from app.models.course import Course
    from app.models.exam import Exam
    from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus
    rows = (
        db.query(
            ExamAttempt.user_id.label("user_id"),
            Student.district.label("district"),
            func.coalesce(func.sum(ExamAttempt.marks_obtained), 0).label("score"),
            func.coalesce(func.sum(ExamAttempt.time_taken_seconds), 0).label("time_taken"),
        )
        .join(User, User.id == ExamAttempt.user_id)
        .join(Student, Student.user_id == User.id)
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .join(Course, Course.id == Exam.course_id)
        .filter(
            Course.subject == subject,
            ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
        )
        .group_by(ExamAttempt.user_id, Student.district)
        .order_by(
            func.coalesce(func.sum(ExamAttempt.marks_obtained), 0).desc(),
            func.coalesce(func.sum(ExamAttempt.time_taken_seconds), 0).asc(),
            ExamAttempt.user_id.asc(),
        )
        .all()
    )

    overall_rank = None
    current_rank = 0
    prev_key = None
    for i, row in enumerate(rows, start=1):
        key = (row.score, row.time_taken)
        if key != prev_key:
            current_rank = i
            prev_key = key
        if row.user_id == user_id:
            overall_rank = current_rank
            break

    district_rank = None
    if district:
        district_rows = [r for r in rows if r.district == district]
        current_rank = 0
        prev_key = None
        for i, row in enumerate(district_rows, start=1):
            key = (row.score, row.time_taken)
            if key != prev_key:
                current_rank = i
                prev_key = key
            if row.user_id == user_id:
                district_rank = current_rank
                break

    return overall_rank, district_rank


@router.post("/exams/{exam_id}/start", response_model=StartExamResponse)
def start_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExamService(db)
    return service.start_exam(exam_id, current_user)


@router.post("/exam-attempts/{attempt_id}/submit", response_model=SubmitExamResponse)
def submit_exam_attempt(
    attempt_id: UUID,
    payload: SubmitExamRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExamService(db)
    return service.submit_exam_attempt(attempt_id, payload, current_user)


@router.get("/rankings/subject/{subject}", response_model=SubjectRankResponse)
def get_subject_rankings(
    subject: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    district = current_user.student.district if current_user.student else None
    overall_rank, district_rank = _compute_subject_ranks(db, current_user.id, subject, district)
    return {
        "subject": subject,
        "overall_rank": overall_rank,
        "district_rank": district_rank,
    }


@router.get("/rankings/subjects")
def get_ranking_subjects(
    db: Session = Depends(get_db),
):
    """Return distinct subjects that have at least one completed exam attempt."""
    service = StudentService(db)
    return service.get_ranking_subjects()


@router.get("/rankings/leaderboard")
def get_rankings_leaderboard(
    subject: str,
    limit: int = 50,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Return the leaderboard for a given subject.
    Aggregates all completed attempts per student (sum score, sum time).
    Optionally highlights the current user's row.
    """
    current_user = get_optional_user(request, db) if request else None
    service = StudentService(db)
    return service.get_rankings_leaderboard(subject, limit, current_user)


@router.get("/my-attempts")
def get_my_attempts(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExamService(db)
    return service.get_my_attempts(current_user, limit)
