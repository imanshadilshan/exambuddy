from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.exam import Exam
from app.models.course import Course
from app.models.question import Question, QuestionOption
from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus, ExamAttemptAnswer
from app.models.enrollment import CourseEnrollment, ExamEnrollment, EnrollmentStatus
from app.models.user import User

from app.schemas.exam import ExamCreate, ExamUpdate
from app.schemas.exam_engine import SubmitExamRequest
from app.dependencies import get_optional_user

class ExamService:
    def __init__(self, db: Session):
        self.db = db

    def list_exams(self, course_id: Optional[UUID] = None) -> List[Exam]:
        query = self.db.query(Exam)
        if course_id:
            query = query.filter(Exam.course_id == course_id)
        return query.order_by(Exam.created_at.desc()).all()

    def create_exam(self, payload: ExamCreate) -> Exam:
        course = self.db.query(Course).filter(Course.id == payload.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        exam = Exam(
            course_id=payload.course_id,
            title=payload.title,
            image_url=payload.image_url,
            image_public_id=payload.image_public_id,
            description=payload.description,
            duration_minutes=payload.duration_minutes,
            total_questions=payload.total_questions,
            is_published=False,
        )
        self.db.add(exam)
        self.db.commit()
        self.db.refresh(exam)
        return exam

    def update_exam(self, exam_id: UUID, payload: ExamUpdate) -> Exam:
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        data = payload.model_dump(exclude_unset=True)
        if "course_id" in data:
            course = self.db.query(Course).filter(Course.id == data["course_id"]).first()
            if not course:
                raise HTTPException(status_code=404, detail="Course not found")

        for field, value in data.items():
            setattr(exam, field, value)

        self.db.commit()
        self.db.refresh(exam)
        return exam

    def delete_exam(self, exam_id: UUID) -> None:
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        self.db.delete(exam)
        self.db.commit()

    def get_course_exams_with_enrollment(self, course_id: UUID, request: Request):
        current_user = get_optional_user(request, self.db)

        # Check if user has full course access
        has_course_access = False
        if current_user:
            course_enrollment = self.db.query(CourseEnrollment).filter(
                CourseEnrollment.user_id == current_user.id,
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.status == EnrollmentStatus.ACTIVE
            ).first()
            has_course_access = course_enrollment is not None

        # Get all exams for the course
        exams = self.db.query(Exam).filter(Exam.course_id == course_id).all()

        result = []
        for exam in exams:
            exam_enrollment = None
            if current_user:
                exam_enrollment = self.db.query(ExamEnrollment).filter(
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

    def check_exam_access(self, exam_id: UUID, current_user: User):
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        course_enrollment = self.db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == exam.course_id,
            CourseEnrollment.status == EnrollmentStatus.ACTIVE
        ).first()

        exam_enrollment = self.db.query(ExamEnrollment).filter(
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

    def start_exam(self, exam_id: UUID, current_user: User):
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        course_enrollment = self.db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == exam.course_id,
            CourseEnrollment.status == EnrollmentStatus.ACTIVE,
        ).first()

        exam_enrollment = self.db.query(ExamEnrollment).filter(
            ExamEnrollment.user_id == current_user.id,
            ExamEnrollment.exam_id == exam.id,
            ExamEnrollment.status == EnrollmentStatus.ACTIVE,
        ).first()

        if not course_enrollment and not exam_enrollment:
            raise HTTPException(status_code=403, detail="You must enroll in this exam first")

        questions = (
            self.db.query(Question)
            .filter(Question.exam_id == str(exam.id))
            .order_by(Question.order_number.asc())
            .all()
        )
        if not questions:
            raise HTTPException(status_code=400, detail="This exam has no questions yet")

        existing_attempt = self.db.query(ExamAttempt).filter(
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
            self.db.add(attempt)
            self.db.commit()
            self.db.refresh(attempt)

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
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        
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

    def _compute_subject_ranks(self, user_id: UUID, subject: str, district: Optional[str]):
        """Helper to get ranks (re-using the query logic internally)"""
        if not subject:
            return 0, 0

        # Subquery: get best (max) marks per user per exam in this subject
        best_attempts_sq = (
            self.db.query(
                ExamAttempt.user_id,
                ExamAttempt.exam_id,
                func.max(ExamAttempt.marks_obtained).label('max_marks'),
                func.min(ExamAttempt.time_taken_seconds).label('min_time')
            )
            .join(Exam, ExamAttempt.exam_id == Exam.id)
            .join(Course, Exam.course_id == Course.id)
            .filter(
                Course.subject == subject,
                ExamAttempt.status.in_([ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.TIMEOUT])
            )
            .group_by(ExamAttempt.user_id, ExamAttempt.exam_id)
            .subquery()
        )

        # Aggregate total marks and total time per user for this subject
        user_scores = (
            self.db.query(
                best_attempts_sq.c.user_id,
                func.sum(best_attempts_sq.c.max_marks).label('total_marks'),
                func.sum(best_attempts_sq.c.min_time).label('total_time')
            )
            .group_by(best_attempts_sq.c.user_id)
            .subquery()
        )

        from app.models.student import Student
        
        # Calculate ranks
        rankings = (
            self.db.query(
                user_scores.c.user_id,
                Student.district,
                func.rank().over(
                    order_by=[
                        user_scores.c.total_marks.desc(),
                        user_scores.c.total_time.asc()
                    ]
                ).label('overall_rank'),
                func.rank().over(
                    partition_by=Student.district,
                    order_by=[
                        user_scores.c.total_marks.desc(),
                        user_scores.c.total_time.asc()
                    ]
                ).label('district_rank')
            )
            .join(Student, Student.user_id == user_scores.c.user_id)
            .subquery()
        )

        user_rank = self.db.query(rankings).filter(rankings.c.user_id == user_id).first()

        overall_rank = user_rank.overall_rank if user_rank else 0
        district_rank = user_rank.district_rank if user_rank else 0

        return overall_rank, district_rank

    def submit_exam_attempt(self, attempt_id: UUID, payload: SubmitExamRequest, current_user: User):
        attempt = self.db.query(ExamAttempt).filter(
            ExamAttempt.id == attempt_id,
            ExamAttempt.user_id == current_user.id,
        ).first()
        
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        if attempt.status != ExamAttemptStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="This attempt is already submitted")

        exam = self.db.query(Exam).filter(Exam.id == attempt.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        questions = (
            self.db.query(Question)
            .filter(Question.exam_id == str(exam.id))
            .order_by(Question.order_number.asc())
            .all()
        )
        if not questions:
            raise HTTPException(status_code=400, detail="Exam has no questions")

        answer_map = {a.question_id: a.selected_option_id for a in payload.answers}

        self.db.query(ExamAttemptAnswer).filter(ExamAttemptAnswer.attempt_id == attempt.id).delete()

        marks_obtained = 0
        review = []
        answers_to_insert = []
        
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

            selected_option_id = answer_map.get(str(q.id))
            is_correct = str(selected_option_id) == str(correct_option.id)
            if is_correct:
                marks_obtained += 1

            answers_to_insert.append(
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
            
        if answers_to_insert:
            self.db.bulk_save_objects(answers_to_insert)

        started_at = attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        raw_time_taken = int((now - started_at).total_seconds())
        max_time = exam.duration_minutes * 60
        final_time_taken = min(raw_time_taken, max_time)

        attempt.status = ExamAttemptStatus.TIMEOUT if raw_time_taken > max_time else ExamAttemptStatus.SUBMITTED
        attempt.submitted_at = now
        attempt.time_taken_seconds = final_time_taken
        attempt.marks_obtained = marks_obtained
        attempt.total_questions = len(questions)

        self.db.commit()

        district = current_user.student.district if current_user.student else None
        subject = exam.course.subject if exam.course else ""
        overall_rank, district_rank = self._compute_subject_ranks(current_user.id, subject, district)

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

    def get_my_attempts(self, current_user: User, limit: int = 10):
        attempts = (
            self.db.query(ExamAttempt)
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
        
        # Cache subject rankings per request to prevent redundant O(N) database loads 
        subject_ranks_cache = {}
        
        for attempt in attempts:
            subject = attempt.exam.course.subject if attempt.exam and attempt.exam.course else ""
            
            if subject and subject not in subject_ranks_cache:
                subject_ranks_cache[subject] = self._compute_subject_ranks(current_user.id, subject, district)
                
            overall_rank, district_rank = subject_ranks_cache.get(subject, (0, 0))
            
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
