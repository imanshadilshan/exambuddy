import time
from app.database import SessionLocal
from app.services.course_service import CourseService
from sqlalchemy import func
from app.models.student import Student
from app.models.course import Course
from app.models.exam import Exam
from app.models.exam_attempt import ExamAttempt, ExamAttemptStatus
from app.models.enrollment import CourseEnrollment

def run_test():
    db = SessionLocal()
    try:
        t0 = time.time()
        print(f"Total students: {db.query(func.count(Student.id)).scalar()}")
        print(f"Q1 took: {time.time() - t0:.4f}s")
        
        t0 = time.time()
        print(f"Total courses: {db.query(func.count(Course.id)).filter(Course.is_active == True).scalar()}")
        print(f"Q2 took: {time.time() - t0:.4f}s")
        
        t0 = time.time()
        print(f"Total exams: {db.query(func.count(Exam.id)).filter(Exam.is_published == True).scalar()}")
        print(f"Q3 took: {time.time() - t0:.4f}s")
        
        t0 = time.time()
        print(f"Total attempts: {db.query(func.count(ExamAttempt.id)).filter(ExamAttempt.status == ExamAttemptStatus.SUBMITTED).scalar()}")
        print(f"Q4 took: {time.time() - t0:.4f}s")
        
        t0 = time.time()
        top_courses_q = (
            db.query(Course, func.count(CourseEnrollment.id).label("enrollment_count"))
            .outerjoin(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .filter(Course.is_active == True)
            .group_by(Course.id)
            .order_by(func.count(CourseEnrollment.id).desc())
            .limit(4)
            .all()
        )
        print(f"Q5 took: {time.time() - t0:.4f}s")
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
