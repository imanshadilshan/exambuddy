"""
Admin Content Management APIs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List
from uuid import UUID
from datetime import datetime, timezone
import csv
import io

from app.database import get_db
from app.dependencies import get_current_admin
from app.config import settings
from app.services.course_service import CourseService
from app.services.exam_service import ExamService
from app.services.question_service import QuestionService
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import Question, QuestionOption
from app.models.student import Student
from app.models.payment import Payment, PaymentStatus, BankSlip, BankSlipStatus
from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus
from app.models.enrollment import CourseEnrollment
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.schemas.question import (
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    QuestionOptionCreate,
)

router = APIRouter()


@router.post("/upload-image", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    entity: str = Form(default="courses"),
    _: User = Depends(get_current_admin)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    max_size_bytes = 5 * 1024 * 1024
    if len(file_bytes) > max_size_bytes:
        raise HTTPException(status_code=400, detail="Image size must be 5MB or less")

    if entity not in {"courses", "exams", "questions"}:
        entity = "courses"

    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder=f"{settings.CLOUDINARY_FOLDER}/{entity}",
            resource_type="image",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(exc)}")

    image_url = upload_result.get("secure_url") or upload_result.get("url")
    image_public_id = upload_result.get("public_id")

    if not image_url or not image_public_id:
        raise HTTPException(status_code=500, detail="Invalid upload response from Cloudinary")

    return {
        "image_url": image_url,
        "image_public_id": image_public_id,
    }


@router.post("/delete-image", status_code=status.HTTP_200_OK)
def delete_image(
    payload: dict,
    _: User = Depends(get_current_admin)
):
    """Delete an image from Cloudinary by public_id"""
    public_id = payload.get("public_id")
    
    if not public_id:
        raise HTTPException(status_code=400, detail="public_id is required")
    
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

        result = cloudinary.uploader.destroy(public_id)
        
        if result.get("result") == "ok":
            return {"message": "Image deleted successfully"}
        else:
            # Still return success even if image wasn't found
            return {"message": "Image deletion processed"}
    except Exception as exc:
        # Log the error but don't fail the request
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(exc)}")


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = CourseService(db)
    return service.create_course(payload)


@router.get("/courses", response_model=List[CourseResponse])
def list_courses(
    grade: int | None = Query(default=None, ge=10, le=13),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = CourseService(db)
    return service.list_courses(grade=grade, subject=subject)


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = CourseService(db)
    return service.update_course(course_id, payload)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = CourseService(db)
    service.delete_course(course_id)
    return None


@router.post("/exams", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = ExamService(db)
    return service.create_exam(payload)


@router.get("/exams", response_model=List[ExamResponse])
def list_exams(
    course_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = ExamService(db)
    return service.list_exams(course_id=course_id)


@router.put("/exams/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: UUID,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = ExamService(db)
    return service.update_exam(exam_id, payload)


@router.delete("/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    service = ExamService(db)
    service.delete_exam(exam_id)
    return None


# ============================================================================
# QUESTIONS MANAGEMENT
# ============================================================================

@router.post("/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Create a new question for an exam"""
    service = QuestionService(db)
    return service.create_question(payload)


@router.get("/questions", response_model=List[QuestionResponse])
def list_questions(
    exam_id: str = Query(..., description="Exam ID to fetch questions for"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """List all questions for an exam"""
    service = QuestionService(db)
    return service.list_questions(exam_id)


@router.get("/questions/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Get a specific question by ID"""
    service = QuestionService(db)
    return service.get_question(question_id)


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update a question and clean up replaced images from Cloudinary"""
    service = QuestionService(db)
    return service.update_question(question_id, payload)


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Delete a question and all associated images from Cloudinary and database"""
    service = QuestionService(db)
    service.delete_question(question_id)
    return None


@router.post("/questions/import-csv/{exam_id}")
async def import_questions_csv(
    exam_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """
    Import questions from CSV file
    CSV format: question_text,option_a,option_b,option_c,option_d,correct_answer,explanation
    """
    service = QuestionService(db)
    return await service.import_questions_csv(exam_id, file)


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Comprehensive admin dashboard statistics with real data"""
    now = datetime.now(timezone.utc)

    # Platform counts
    total_students = db.query(func.count(Student.id)).scalar() or 0
    total_courses = db.query(func.count(Course.id)).filter(Course.is_active == True).scalar() or 0
    total_exams = db.query(func.count(Exam.id)).filter(Exam.is_published == True).scalar() or 0
    total_exam_attempts = (
        db.query(func.count(ExamAttempt.id))
        .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
        .scalar() or 0
    )

    # Revenue
    total_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.status == PaymentStatus.COMPLETED.value)
        .scalar() or 0
    )
    revenue_this_month = (
        db.query(func.sum(Payment.amount))
        .filter(
            Payment.status == PaymentStatus.COMPLETED.value,
            extract('year', Payment.completed_at) == now.year,
            extract('month', Payment.completed_at) == now.month,
        )
        .scalar() or 0
    )
    pending_bank_slips = (
        db.query(func.count(BankSlip.id))
        .filter(BankSlip.status == BankSlipStatus.PENDING.value)
        .scalar() or 0
    )

    # Recent activity: new student registrations
    recent_students = (
        db.query(User, Student)
        .join(Student, Student.user_id == User.id)
        .order_by(User.created_at.desc())
        .limit(5)
        .all()
    )

    # Recent verified bank slips
    recent_payments = (
        db.query(BankSlip, Student)
        .join(Student, Student.user_id == BankSlip.user_id, isouter=True)
        .filter(BankSlip.status == BankSlipStatus.VERIFIED.value)
        .order_by(BankSlip.verified_at.desc())
        .limit(5)
        .all()
    )

    # Recent exams created
    recent_exams = (
        db.query(Exam, Course)
        .join(Course, Course.id == Exam.course_id)
        .order_by(Exam.created_at.desc())
        .limit(5)
        .all()
    )

    activity = []
    for user, student in recent_students:
        ts = user.created_at.isoformat() if user.created_at else None
        activity.append({
            "type": "student",
            "title": "New student registration",
            "subtitle": f"{student.full_name} joined from {student.district}",
            "timestamp": ts,
        })

    for slip, student in recent_payments:
        name = student.full_name if student else "Unknown"
        ts = slip.verified_at.isoformat() if slip.verified_at else None
        activity.append({
            "type": "payment",
            "title": "Payment verified",
            "subtitle": f"Bank slip verified for {name}",
            "timestamp": ts,
        })

    for exam, course in recent_exams:
        ts = exam.created_at.isoformat() if exam.created_at else None
        activity.append({
            "type": "exam",
            "title": "New exam uploaded",
            "subtitle": f"{exam.title} — {course.title}",
            "timestamp": ts,
        })

    activity.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    activity = activity[:8]

    return {
        "total_students": total_students,
        "total_courses": total_courses,
        "total_exams": total_exams,
        "total_exam_attempts": total_exam_attempts,
        "total_revenue": total_revenue,
        "revenue_this_month": revenue_this_month,
        "pending_bank_slips": pending_bank_slips,
        "recent_activity": activity,
    }


@router.get("/questions/csv-template")
def download_csv_template(
    _: User = Depends(get_current_admin)
):
    """Download a CSV template for importing questions"""
    csv_content = """question_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation
What is the capital of France?,London,Paris,Berlin,Madrid,,B,Paris is the capital and largest city of France.
Which planet is known as the Red Planet?,Venus,Mars,Jupiter,Saturn,,B,Mars is called the Red Planet because of its reddish appearance.
What is 2 + 2?,3,4,5,6,,B,Basic arithmetic: 2 plus 2 equals 4.
"For Grade 12-13: What is the derivative of x^2?",x,2x,x^2,2,0,B,"The derivative of x^2 is 2x, using the power rule."
"""
    
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=questions_template.csv"}
    )


# ============================================================================
# STUDENTS MANAGEMENT
# ============================================================================

@router.get("/students")
def list_students(
    search: str | None = Query(default=None),
    grade: int | None = Query(default=None),
    district: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """List all students with optional filters"""
    query = (
        db.query(User, Student)
        .join(Student, Student.user_id == User.id)
    )

    if search:
        like = f"%{search}%"
        query = query.filter(
            (Student.full_name.ilike(like)) |
            (User.email.ilike(like)) |
            (Student.school.ilike(like))
        )
    if grade is not None:
        query = query.filter(Student.grade == grade)
    if district:
        query = query.filter(Student.district.ilike(f"%{district}%"))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    rows = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    if not rows:
        return {"total": total, "students": []}

    user_ids = [user.id for user, _ in rows]

    # Load enrollment and attempt counts in bulk to avoid N+1 queries
    enrollment_counts = dict(
        db.query(CourseEnrollment.user_id, func.count(CourseEnrollment.id))
        .filter(CourseEnrollment.user_id.in_(user_ids))
        .group_by(CourseEnrollment.user_id)
        .all()
    )
    attempt_counts = dict(
        db.query(ExamAttempt.user_id, func.count(ExamAttempt.id))
        .filter(ExamAttempt.user_id.in_(user_ids))
        .group_by(ExamAttempt.user_id)
        .all()
    )

    result = []
    for user, student in rows:
        result.append({
            "user_id": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "joined_at": user.created_at.isoformat() if user.created_at else None,
            "full_name": student.full_name,
            "phone_number": student.phone_number,
            "school": student.school,
            "district": student.district,
            "grade": student.grade,
            "profile_photo_url": student.profile_photo_url,
            "enrollment_count": enrollment_counts.get(user.id, 0),
            "attempt_count": attempt_counts.get(user.id, 0),
        })

    return {"total": total, "students": result}



@router.patch("/students/{user_id}/toggle-active")
def toggle_student_active(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Activate or deactivate a student account"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {"user_id": str(user.id), "is_active": user.is_active}


# ============================================================================
# ANALYTICS
# ============================================================================

@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Platform-wide analytics for the admin dashboard"""

    # Revenue by month (last 6 months)
    revenue_rows = (
        db.query(
            extract("year", Payment.completed_at).label("year"),
            extract("month", Payment.completed_at).label("month"),
            func.sum(Payment.amount).label("revenue"),
            func.count(Payment.id).label("count"),
        )
        .filter(Payment.status == PaymentStatus.COMPLETED.value)
        .filter(Payment.completed_at.isnot(None))
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(12)
        .all()
    )
    revenue_by_month = [
        {"year": int(r.year), "month": int(r.month), "revenue": int(r.revenue or 0), "count": int(r.count)}
        for r in revenue_rows
    ]

    # Students by grade
    grade_rows = (
        db.query(Student.grade, func.count(Student.id).label("count"))
        .group_by(Student.grade)
        .order_by(Student.grade)
        .all()
    )
    students_by_grade = [{"grade": r.grade, "count": r.count} for r in grade_rows]

    # Students by district (top 10)
    district_rows = (
        db.query(Student.district, func.count(Student.id).label("count"))
        .group_by(Student.district)
        .order_by(func.count(Student.id).desc())
        .limit(10)
        .all()
    )
    students_by_district = [{"district": r.district, "count": r.count} for r in district_rows]

    # Exam attempts by month (last 6)
    attempt_rows = (
        db.query(
            extract("year", ExamAttempt.submitted_at).label("year"),
            extract("month", ExamAttempt.submitted_at).label("month"),
            func.count(ExamAttempt.id).label("count"),
        )
        .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
        .filter(ExamAttempt.submitted_at.isnot(None))
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(12)
        .all()
    )
    attempts_by_month = [
        {"year": int(r.year), "month": int(r.month), "count": int(r.count)}
        for r in attempt_rows
    ]

    # Top exams by attempt count with avg score
    top_exams_q = (
        db.query(
            Exam.id,
            Exam.title,
            Course.subject,
            Course.grade,
            func.count(ExamAttempt.id).label("attempt_count"),
            func.avg(
                (ExamAttempt.marks_obtained * 100.0) / ExamAttempt.total_questions
            ).label("avg_score"),
        )
        .join(Course, Course.id == Exam.course_id)
        .outerjoin(ExamAttempt, ExamAttempt.exam_id == Exam.id)
        .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
        .group_by(Exam.id, Exam.title, Course.subject, Course.grade)
        .order_by(func.count(ExamAttempt.id).desc())
        .limit(8)
        .all()
    )
    top_exams = [
        {
            "exam_id": str(r.id),
            "title": r.title,
            "subject": r.subject,
            "grade": r.grade,
            "attempt_count": r.attempt_count,
            "avg_score": round(float(r.avg_score or 0), 1),
        }
        for r in top_exams_q
    ]

    # Enrollments by subject
    subject_rows = (
        db.query(Course.subject, func.count(CourseEnrollment.id).label("count"))
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .group_by(Course.subject)
        .order_by(func.count(CourseEnrollment.id).desc())
        .all()
    )
    enrollments_by_subject = [{"subject": r.subject, "count": r.count} for r in subject_rows]

    return {
        "revenue_by_month": revenue_by_month,
        "students_by_grade": students_by_grade,
        "students_by_district": students_by_district,
        "attempts_by_month": attempts_by_month,
        "top_exams": top_exams,
        "enrollments_by_subject": enrollments_by_subject,
    }


# ============================================================================
# RANKINGS (admin view)
# ============================================================================

@router.get("/rankings")
def admin_rankings(
    subject: str | None = Query(default=None),
    grade: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    """Admin view of subject rankings across all students"""
    q = (
        db.query(
            User.id.label("user_id"),
            Student.full_name,
            Student.district,
            Student.grade,
            Student.school,
            Course.subject,
            func.sum(ExamAttempt.marks_obtained).label("total_marks"),
            func.sum(ExamAttempt.total_questions).label("total_questions"),
            func.count(ExamAttempt.id).label("attempt_count"),
        )
        .join(Student, Student.user_id == User.id)
        .join(ExamAttempt, ExamAttempt.user_id == User.id)
        .join(Exam, Exam.id == ExamAttempt.exam_id)
        .join(Course, Course.id == Exam.course_id)
        .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
    )
    if subject:
        q = q.filter(Course.subject.ilike(f"%{subject}%"))
    if grade:
        q = q.filter(Student.grade == grade)

    q = (
        q.group_by(User.id, Student.full_name, Student.district, Student.grade, Student.school, Course.subject)
        .order_by(func.sum(ExamAttempt.marks_obtained).desc())
        .limit(limit)
    )

    rows = q.all()
    rankings = []
    for i, r in enumerate(rows):
        total_q = int(r.total_questions or 1)
        pct = round((int(r.total_marks or 0) / total_q) * 100, 1)
        rankings.append({
            "rank": i + 1,
            "user_id": str(r.user_id),
            "full_name": r.full_name,
            "district": r.district,
            "grade": r.grade,
            "school": r.school,
            "subject": r.subject,
            "total_marks": int(r.total_marks or 0),
            "total_questions": total_q,
            "score_pct": pct,
            "attempt_count": int(r.attempt_count),
        })

    # Unique subjects for filter dropdown
    subject_rows = (
        db.query(Course.subject)
        .join(Exam, Exam.course_id == Course.id)
        .join(ExamAttempt, ExamAttempt.exam_id == Exam.id)
        .filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED)
        .distinct()
        .all()
    )
    subjects = sorted([r.subject for r in subject_rows if r.subject])

    return {"rankings": rankings, "subjects": subjects}
