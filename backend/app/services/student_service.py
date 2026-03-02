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

    def get_ranking_exams(self) -> List[dict]:
        rows = (
            self.db.query(Exam.id, Exam.title, Course.title.label("course_title"), Course.subject)
            .join(Course, Exam.course_id == Course.id)
            .join(ExamAttempt, ExamAttempt.exam_id == Exam.id)
            .filter(
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT]),
            )
            .distinct()
            .order_by(Course.subject.asc(), Course.title.asc(), Exam.title.asc())
            .all()
        )
        return [
            {
                "exam_id": str(r.id),
                "exam_title": r.title,
                "course_title": r.course_title,
                "subject": r.subject,
            }
            for r in rows
        ]

    def get_rankings_leaderboard(self, exam_id: str, limit: int, current_user: Optional[User]) -> List[dict]:
        # Subquery 1: get best attempt per user for THIS exact exam
        best_attempts_sq = (
            self.db.query(
                ExamAttempt.user_id,
                ExamAttempt.exam_id,
                func.max(ExamAttempt.marks_obtained).label('max_marks'),
                func.min(ExamAttempt.time_taken_seconds).label('min_time')
            )
            .filter(
                ExamAttempt.exam_id == exam_id,
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT])
            )
            .group_by(ExamAttempt.user_id, ExamAttempt.exam_id)
            .subquery()
        )

        from app.models.student import Student

        # Subquery 2: compute ranks before applying limits
        ranked_sq = (
            self.db.query(
                best_attempts_sq.c.user_id,
                best_attempts_sq.c.max_marks.label("score"),
                best_attempts_sq.c.min_time.label("time_taken"),
                Student.full_name,
                Student.school,
                Student.district,
                Student.grade,
                Exam.total_questions,
                func.rank().over(
                    order_by=[
                        best_attempts_sq.c.max_marks.desc(),
                        best_attempts_sq.c.min_time.asc()
                    ]
                ).label("island_rank"),
                func.rank().over(
                    partition_by=Student.district,
                    order_by=[
                        best_attempts_sq.c.max_marks.desc(),
                        best_attempts_sq.c.min_time.asc()
                    ]
                ).label("district_rank")
            )
            .join(Student, Student.user_id == best_attempts_sq.c.user_id)
            .join(Exam, Exam.id == best_attempts_sq.c.exam_id)
            .subquery()
        )

        rows = (
            self.db.query(ranked_sq)
            .order_by(ranked_sq.c.island_rank.asc())
            .limit(max(1, min(limit, 200)))
            .all()
        )

        result = []
        for row in rows:
            # compute score as percentage strictly out of 100
            pct = 0
            if row.total_questions and row.total_questions > 0:
                pct = round((row.score / row.total_questions) * 100)
                
            result.append({
                "rank": row.island_rank,
                "district_rank": row.district_rank,
                "full_name": row.full_name,
                "school": row.school,
                "district": row.district,
                "grade": row.grade,
                "score": pct,
                "time_taken_seconds": row.time_taken,
                "attempts": 1,
                "is_current_user": (current_user is not None and str(row.user_id) == str(current_user.id)),
            })

        return result
