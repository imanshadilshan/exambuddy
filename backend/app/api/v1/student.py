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
from app.models.student import Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import Question, QuestionOption
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.models.exam_attempt import ExamAttempt, ExamAttemptAnswer, ExamAttemptStatus
from app.schemas.course import CourseResponse
from app.schemas.exam_engine import (
    StartExamResponse,
    SubmitExamRequest,
    SubmitExamResponse,
    SubjectRankResponse,
)
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


def _compute_subject_ranks(db: Session, user_id: UUID, subject: str, district: Optional[str]):
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
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    course_enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.course_id == exam.course_id,
        CourseEnrollment.status == EnrollmentStatus.ACTIVE,
    ).first()

    exam_enrollment = db.query(ExamEnrollment).filter(
        ExamEnrollment.user_id == current_user.id,
        ExamEnrollment.exam_id == exam.id,
        ExamEnrollment.status == EnrollmentStatus.ACTIVE,
    ).first()

    if not course_enrollment and not exam_enrollment:
        raise HTTPException(status_code=403, detail="You must enroll in this exam first")

    questions = (
        db.query(Question)
        .filter(Question.exam_id == str(exam.id))
        .order_by(Question.order_number.asc())
        .all()
    )
    if not questions:
        raise HTTPException(status_code=400, detail="This exam has no questions yet")

    existing_attempt = db.query(ExamAttempt).filter(
        ExamAttempt.user_id == current_user.id,
        ExamAttempt.exam_id == exam.id,
        ExamAttempt.status == ExamAttemptStatus.IN_PROGRESS,
    ).first()

    attempt = existing_attempt
    if not attempt:
        attempt = ExamAttempt(
            user_id=current_user.id,
            exam_id=exam.id,
            status=ExamAttemptStatus.IN_PROGRESS,
            total_questions=len(questions),
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    payload_questions = []
    for q in questions:
        options = sorted(q.options, key=lambda o: o.order_number)
        if len(options) not in (4, 5):
            raise HTTPException(
                status_code=400,
                detail=f"Question {q.order_number} must have exactly 4 or 5 options",
            )

        payload_questions.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_image_url": q.question_image_url,
            "explanation": q.explanation,
            "order_number": q.order_number,
            "options": [
                {
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "option_image_url": opt.option_image_url,
                    "order_number": opt.order_number,
                }
                for opt in options
            ],
        })

    started_at = attempt.started_at
    ends_at = started_at + timedelta(minutes=exam.duration_minutes)

    return {
        "attempt_id": attempt.id,
        "exam_id": exam.id,
        "exam_title": exam.title,
        "subject": exam.course.subject if exam.course else "",
        "duration_minutes": exam.duration_minutes,
        "started_at": started_at,
        "ends_at": ends_at,
        "questions": payload_questions,
    }


@router.post("/exam-attempts/{attempt_id}/submit", response_model=SubmitExamResponse)
def submit_exam_attempt(
    attempt_id: UUID,
    payload: SubmitExamRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == current_user.id,
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status != ExamAttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="This attempt is already submitted")

    exam = db.query(Exam).filter(Exam.id == attempt.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = (
        db.query(Question)
        .filter(Question.exam_id == str(exam.id))
        .order_by(Question.order_number.asc())
        .all()
    )
    if not questions:
        raise HTTPException(status_code=400, detail="Exam has no questions")

    answer_map = {a.question_id: a.selected_option_id for a in payload.answers}

    db.query(ExamAttemptAnswer).filter(ExamAttemptAnswer.attempt_id == attempt.id).delete()

    marks_obtained = 0
    review = []
    for q in questions:
        options = sorted(q.options, key=lambda o: o.order_number)
        if len(options) not in (4, 5):
            raise HTTPException(
                status_code=400,
                detail=f"Question {q.order_number} must have exactly 4 or 5 options",
            )

        correct_option = next((opt for opt in options if opt.is_correct), None)
        if not correct_option:
            raise HTTPException(status_code=400, detail=f"Question {q.order_number} has no correct option")

        selected_option_id = answer_map.get(q.id)
        is_correct = selected_option_id == correct_option.id
        if is_correct:
            marks_obtained += 1

        db.add(
            ExamAttemptAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option_id=selected_option_id,
                is_correct=1 if is_correct else 0,
            )
        )

        review.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "explanation": q.explanation,
            "selected_option_id": selected_option_id,
            "correct_option_id": correct_option.id,
            "is_correct": is_correct,
        })

    now = datetime.now(timezone.utc)
    raw_time_taken = int((now - attempt.started_at).total_seconds())
    max_time = exam.duration_minutes * 60
    final_time_taken = min(raw_time_taken, max_time)

    attempt.status = ExamAttemptStatus.TIMEOUT if raw_time_taken > max_time else ExamAttemptStatus.SUBMITTED
    attempt.submitted_at = now
    attempt.time_taken_seconds = final_time_taken
    attempt.marks_obtained = marks_obtained
    attempt.total_questions = len(questions)

    db.commit()

    district = current_user.student.district if current_user.student else None
    subject = exam.course.subject if exam.course else ""
    overall_rank, district_rank = _compute_subject_ranks(db, current_user.id, subject, district)

    return {
        "attempt_id": attempt.id,
        "marks_obtained": marks_obtained,
        "total_questions": len(questions),
        "time_taken_seconds": final_time_taken,
        "review": review,
        "ranking": {
            "subject": subject,
            "overall_rank": overall_rank,
            "district_rank": district_rank,
        },
    }


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


@router.get("/my-attempts")
def get_my_attempts(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempts = (
        db.query(ExamAttempt)
        .options(
            joinedload(ExamAttempt.exam).joinedload(Exam.course)
        )
        .filter(
            ExamAttempt.user_id == current_user.id,
            ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
        )
        .order_by(ExamAttempt.submitted_at.desc().nullslast(), ExamAttempt.started_at.desc())
        .limit(max(1, min(limit, 50)))
        .all()
    )

    district = current_user.student.district if current_user.student else None
    response = []
    for attempt in attempts:
        subject = attempt.exam.course.subject if attempt.exam and attempt.exam.course else ""
        overall_rank, district_rank = _compute_subject_ranks(db, current_user.id, subject, district)
        response.append({
            "attempt_id": str(attempt.id),
            "exam_id": str(attempt.exam_id),
            "exam_title": attempt.exam.title if attempt.exam else "",
            "subject": subject,
            "marks_obtained": attempt.marks_obtained,
            "total_questions": attempt.total_questions,
            "time_taken_seconds": attempt.time_taken_seconds,
            "status": attempt.status.value if hasattr(attempt.status, "value") else str(attempt.status),
            "submitted_at": attempt.submitted_at,
            "overall_rank": overall_rank,
            "district_rank": district_rank,
        })

    return response
