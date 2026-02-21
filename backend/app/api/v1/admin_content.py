"""
Admin Content Management APIs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse

router = APIRouter()


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
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
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses", response_model=List[CourseResponse])
def list_courses(
    grade: int | None = Query(default=None, ge=10, le=13),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    query = db.query(Course)

    if grade is not None:
        query = query.filter(Course.grade == grade)
    if subject:
        query = query.filter(Course.subject.ilike(f"%{subject}%"))

    return query.order_by(Course.grade.asc(), Course.subject.asc(), Course.title.asc()).all()


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return None


@router.post("/exams", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    course = db.query(Course).filter(Course.id == payload.course_id).first()
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
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get("/exams", response_model=List[ExamResponse])
def list_exams(
    course_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    query = db.query(Exam)
    if course_id:
        query = query.filter(Exam.course_id == course_id)

    return query.order_by(Exam.created_at.desc()).all()


@router.put("/exams/{exam_id}", response_model=ExamResponse)
def update_exam(
    exam_id: UUID,
    payload: ExamUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    data = payload.model_dump(exclude_unset=True)
    if "course_id" in data:
        course = db.query(Course).filter(Course.id == data["course_id"]).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    for field, value in data.items():
        setattr(exam, field, value)

    db.commit()
    db.refresh(exam)
    return exam


@router.delete("/exams/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(
    exam_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    db.delete(exam)
    db.commit()
    return None
