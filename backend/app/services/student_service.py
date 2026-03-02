from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.user import User
from app.models.student import Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus


class StudentService:
    def __init__(self, db: Session):
        self.db = db

    def get_my_enrollments(self, current_user: User) -> dict:
        course_enrollments = self.db.query(CourseEnrollment).options(
            joinedload(CourseEnrollment.course)
        ).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.status == EnrollmentStatus.ACTIVE
        ).all()

        exam_enrollments = self.db.query(ExamEnrollment).options(
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

    def enroll_free_exam(self, exam_id: UUID, current_user: User) -> dict:
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        if exam.price != 0:
            raise HTTPException(status_code=400, detail="This exam is not free")

        course_enrollment = self.db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == exam.course_id,
            CourseEnrollment.status == EnrollmentStatus.ACTIVE
        ).first()
        
        if course_enrollment:
            return {"message": "Already enrolled via course", "enrollment_type": "course"}

        existing = self.db.query(ExamEnrollment).filter(
            ExamEnrollment.user_id == current_user.id,
            ExamEnrollment.exam_id == exam_id,
            ExamEnrollment.status == EnrollmentStatus.ACTIVE
        ).first()
        
        if existing:
            return {"message": "Already enrolled", "enrollment_id": str(existing.id)}

        enrollment = ExamEnrollment(
            user_id=current_user.id,
            exam_id=exam_id,
            status=EnrollmentStatus.ACTIVE
        )
        self.db.add(enrollment)
        self.db.commit()
        self.db.refresh(enrollment)

        return {
            "message": "Successfully enrolled in free exam",
            "enrollment_id": str(enrollment.id)
        }

    def get_ranking_subjects(self) -> List[str]:
        rows = (
            self.db.query(Course.subject)
            .join(Exam, Exam.course_id == Course.id)
            .join(ExamAttempt, ExamAttempt.exam_id == Exam.id)
            .filter(
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
            )
            .distinct()
            .order_by(Course.subject.asc())
            .all()
        )
        return [row.subject for row in rows]

    def get_rankings_leaderboard(self, subject: str, limit: int, current_user: Optional[User]) -> List[dict]:
        rows = (
            self.db.query(
                ExamAttempt.user_id.label("user_id"),
                Student.full_name.label("full_name"),
                Student.school.label("school"),
                Student.district.label("district"),
                Student.grade.label("grade"),
                func.coalesce(func.sum(ExamAttempt.marks_obtained), 0).label("score"),
                func.coalesce(func.sum(ExamAttempt.time_taken_seconds), 0).label("time_taken"),
                func.count(ExamAttempt.id).label("attempts"),
            )
            .join(User, User.id == ExamAttempt.user_id)
            .join(Student, Student.user_id == User.id)
            .join(Exam, Exam.id == ExamAttempt.exam_id)
            .join(Course, Course.id == Exam.course_id)
            .filter(
                Course.subject == subject,
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
            )
            .group_by(
                ExamAttempt.user_id,
                Student.full_name,
                Student.school,
                Student.district,
                Student.grade,
            )
            .order_by(
                func.coalesce(func.sum(ExamAttempt.marks_obtained), 0).desc(),
                func.coalesce(func.sum(ExamAttempt.time_taken_seconds), 0).asc(),
            )
            .limit(max(1, min(limit, 200)))
            .all()
        )

        result = []
        current_rank = 0
        prev_key = None
        for i, row in enumerate(rows, start=1):
            key = (row.score, row.time_taken)
            if key != prev_key:
                current_rank = i
                prev_key = key

            result.append({
                "rank": current_rank,
                "full_name": row.full_name,
                "school": row.school,
                "district": row.district,
                "grade": row.grade,
                "score": row.score,
                "time_taken_seconds": row.time_taken,
                "attempts": row.attempts,
                "is_current_user": (current_user is not None and str(row.user_id) == str(current_user.id)),
            })

        return result
