"""
Admin Content Management APIs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_admin
from app.config import settings
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse

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

    if entity not in {"courses", "exams"}:
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
