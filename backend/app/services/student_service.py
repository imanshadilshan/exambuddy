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
        from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus

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

        # Look up last completed attempt for each enrolled exam
        enrolled_exam_ids = [e.exam_id for e in exam_enrollments]
        last_attempts = {}
        if enrolled_exam_ids:
            rows = (
                self.db.query(ExamAttempt)
                .filter(
                    ExamAttempt.user_id == current_user.id,
                    ExamAttempt.exam_id.in_(enrolled_exam_ids),
                    ExamAttempt.status.in_([
                        ExamAttemptStatus.SUBMITTED,
                        ExamAttemptStatus.TIMEOUT,
                    ]),
                )
                .order_by(ExamAttempt.submitted_at.desc())
                .all()
            )
            for row in rows:
                eid = str(row.exam_id)
                if eid not in last_attempts:
                    last_attempts[eid] = row

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
                    "enrolled_at": e.enrolled_at,
                    "already_attempted": str(e.exam_id) in last_attempts,
                    "last_score": last_attempts[str(e.exam_id)].marks_obtained if str(e.exam_id) in last_attempts else None,
                    "last_total": last_attempts[str(e.exam_id)].total_questions if str(e.exam_id) in last_attempts else None,
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
        # Subquery: last completed attempt per user per exam in this subject
        last_attempt_sq = (
            self.db.query(
                ExamAttempt.user_id,
                ExamAttempt.exam_id,
                func.max(ExamAttempt.submitted_at).label("last_submitted_at"),
            )
            .join(Exam, ExamAttempt.exam_id == Exam.id)
            .join(Course, Exam.course_id == Course.id)
            .filter(
                Course.subject == subject,
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
            )
            .group_by(ExamAttempt.user_id, ExamAttempt.exam_id)
            .subquery()
        )

        # Join to get marks/time for those last attempts
        last_attempt_data_sq = (
            self.db.query(
                ExamAttempt.user_id,
                ExamAttempt.marks_obtained,
                ExamAttempt.time_taken_seconds,
            )
            .join(
                last_attempt_sq,
                (ExamAttempt.user_id == last_attempt_sq.c.user_id)
                & (ExamAttempt.exam_id == last_attempt_sq.c.exam_id)
                & (ExamAttempt.submitted_at == last_attempt_sq.c.last_submitted_at),
            )
            .subquery()
        )

        rows = (
            self.db.query(
                last_attempt_data_sq.c.user_id.label("user_id"),
                Student.full_name.label("full_name"),
                Student.school.label("school"),
                Student.district.label("district"),
                Student.grade.label("grade"),
                func.coalesce(func.sum(last_attempt_data_sq.c.marks_obtained), 0).label("score"),
                func.coalesce(func.sum(last_attempt_data_sq.c.time_taken_seconds), 0).label("time_taken"),
                func.count(last_attempt_data_sq.c.user_id).label("attempts"),
            )
            .join(Student, Student.user_id == last_attempt_data_sq.c.user_id)
            .group_by(
                last_attempt_data_sq.c.user_id,
                Student.full_name,
                Student.school,
                Student.district,
                Student.grade,
            )
            .order_by(
                func.coalesce(func.sum(last_attempt_data_sq.c.marks_obtained), 0).desc(),
                func.coalesce(func.sum(last_attempt_data_sq.c.time_taken_seconds), 0).asc(),
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
