"""
Admin Content Management APIs
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import csv
import io

from app.database import get_db
from app.dependencies import get_current_admin
from app.config import settings
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import Question, QuestionOption
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
    # Verify exam exists
    exam = db.query(Exam).filter(Exam.id == payload.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Validate that at least one option is correct
    correct_options = [opt for opt in payload.options if opt.is_correct]
    if len(correct_options) != 1:
        raise HTTPException(
            status_code=400,
            detail="Exactly one option must be marked as correct"
        )

    # Validate that each option has either text or image
    for idx, opt in enumerate(payload.options):
        if not opt.option_text and not opt.option_image_url:
            raise HTTPException(
                status_code=400,
                detail=f"Option {idx + 1} must have either text or image"
            )

    # Create question
    question = Question(
        exam_id=payload.exam_id,
        question_text=payload.question_text,
        question_image_url=payload.question_image_url,
        question_image_public_id=payload.question_image_public_id,
        explanation=payload.explanation,
        order_number=payload.order_number,
    )
    db.add(question)
    db.flush()  # Get the question ID before adding options

    # Create options
    for option_data in payload.options:
        option = QuestionOption(
            question_id=question.id,
            option_text=option_data.option_text,
            option_image_url=option_data.option_image_url,
            option_image_public_id=option_data.option_image_public_id,
            is_correct=option_data.is_correct,
            order_number=option_data.order_number,
        )
        db.add(option)

    db.commit()
    db.refresh(question)
    return question


@router.get("/questions", response_model=List[QuestionResponse])
def list_questions(
    exam_id: str = Query(..., description="Exam ID to fetch questions for"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """List all questions for an exam"""
    # Verify exam exists
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = (
        db.query(Question)
        .filter(Question.exam_id == exam_id)
        .order_by(Question.order_number.asc())
        .all()
    )
    return questions


@router.get("/questions/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Get a specific question by ID"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: str,
    payload: QuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Update a question and clean up replaced images from Cloudinary"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

    # Check if question image is being replaced
    if payload.question_image_public_id is not None:
        old_image_public_id = question.question_image_public_id
        new_image_public_id = payload.question_image_public_id
        
        # Delete old image if it's being replaced with a different one
        if old_image_public_id and old_image_public_id != new_image_public_id:
            try:
                cloudinary.uploader.destroy(old_image_public_id)
            except Exception as e:
                print(f"Failed to delete old question image: {str(e)}")

    # Update question fields
    update_data = payload.model_dump(exclude_unset=True, exclude={"options"})
    for field, value in update_data.items():
        setattr(question, field, value)

    # Update options if provided
    if payload.options is not None:
        # Validate that at least one option is correct
        correct_options = [opt for opt in payload.options if opt.is_correct]
        if len(correct_options) != 1:
            raise HTTPException(
                status_code=400,
                detail="Exactly one option must be marked as correct"
            )

        # Collect old option image public_ids before deleting
        old_options = db.query(QuestionOption).filter(QuestionOption.question_id == question_id).all()
        old_image_public_ids = {opt.option_image_public_id for opt in old_options if opt.option_image_public_id}
        
        # Collect new option image public_ids to keep
        new_image_public_ids = {opt.option_image_public_id for opt in payload.options if opt.option_image_public_id}
        
        # Delete images that are being replaced (old images not in new set)
        images_to_delete = old_image_public_ids - new_image_public_ids
        for public_id in images_to_delete:
            try:
                cloudinary.uploader.destroy(public_id)
            except Exception as e:
                print(f"Failed to delete old option image: {str(e)}")

        # Delete existing options from database
        db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()

        # Create new options
        for option_data in payload.options:
            option = QuestionOption(
                question_id=question_id,
                option_text=option_data.option_text,
                option_image_url=option_data.option_image_url,
                option_image_public_id=option_data.option_image_public_id,
                is_correct=option_data.is_correct,
                order_number=option_data.order_number,
            )
            db.add(option)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Delete a question and all associated images from Cloudinary and database"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Delete images from Cloudinary
    import cloudinary
    import cloudinary.uploader

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )

    # Delete question image if exists
    if question.question_image_public_id:
        try:
            cloudinary.uploader.destroy(question.question_image_public_id)
        except Exception as e:
            # Log but don't fail if image deletion fails
            print(f"Failed to delete question image: {str(e)}")

    # Delete all option images
    for option in question.options:
        if option.option_image_public_id:
            try:
                cloudinary.uploader.destroy(option.option_image_public_id)
            except Exception as e:
                print(f"Failed to delete option image: {str(e)}")

    # Delete question from database (cascade will delete options)
    db.delete(question)
    db.commit()
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
    # Verify exam exists
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Get course to determine grade
    course = db.query(Course).filter(Course.id == exam.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Determine expected options based on grade
    grade = course.grade
    has_five_options = grade in [12, 13]

    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))

        # Get the current max order number
        max_order = db.query(Question).filter(Question.exam_id == exam_id).count()

        questions_created = 0
        errors = []

        for idx, row in enumerate(csv_reader, start=1):
            try:
                # Validate required fields
                required_fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
                if has_five_options:
                    required_fields.append('option_e')
                    
                missing_fields = [f for f in required_fields if f not in row or not row[f].strip()]
                
                if missing_fields:
                    errors.append(f"Row {idx}: Missing fields: {', '.join(missing_fields)}")
                    continue

                # Validate correct_answer
                correct_answer = row['correct_answer'].strip().upper()
                valid_answers = ['A', 'B', 'C', 'D', 'E'] if has_five_options else ['A', 'B', 'C', 'D']
                if correct_answer not in valid_answers:
                    errors.append(f"Row {idx}: correct_answer must be {' or '.join(valid_answers)}")
                    continue

                # Create question
                question = Question(
                    exam_id=exam_id,
                    question_text=row['question_text'].strip(),
                    explanation=row.get('explanation', '').strip() or None,
                    order_number=max_order + questions_created + 1,
                )
                db.add(question)
                db.flush()

                # Create options
                options_data = [
                    ('A', row['option_a'].strip(), 1),
                    ('B', row['option_b'].strip(), 2),
                    ('C', row['option_c'].strip(), 3),
                    ('D', row['option_d'].strip(), 4),
                ]
                
                if has_five_options:
                    options_data.append(('E', row['option_e'].strip(), 5))

                for letter, text, order in options_data:
                    option = QuestionOption(
                        question_id=question.id,
                        option_text=text,
                        is_correct=(letter == correct_answer),
                        order_number=order,
                    )
                    db.add(option)

                questions_created += 1

            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                continue

        db.commit()

        return {
            "message": f"Successfully imported {questions_created} questions",
            "questions_created": questions_created,
            "errors": errors if errors else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")


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


