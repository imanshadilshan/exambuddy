import csv
import io
from typing import List, Optional
from uuid import UUID
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.models.exam import Exam
from app.models.course import Course
from app.models.question import Question, QuestionOption
from app.schemas.question import QuestionCreate, QuestionUpdate
from app.config import settings

class QuestionService:
    def __init__(self, db: Session):
        self.db = db

    def create_question(self, payload: QuestionCreate) -> Question:
        exam = self.db.query(Exam).filter(Exam.id == payload.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        correct_options = [opt for opt in payload.options if opt.is_correct]
        if len(correct_options) != 1:
            raise HTTPException(
                status_code=400,
                detail="Exactly one option must be marked as correct"
            )

        for idx, opt in enumerate(payload.options):
            if not opt.option_text and not opt.option_image_url:
                raise HTTPException(
                    status_code=400,
                    detail=f"Option {idx + 1} must have either text or image"
                )

        question = Question(
            exam_id=payload.exam_id,
            question_text=payload.question_text,
            question_image_url=payload.question_image_url,
            question_image_public_id=payload.question_image_public_id,
            explanation=payload.explanation,
            order_number=payload.order_number,
        )
        self.db.add(question)
        self.db.flush()

        for option_data in payload.options:
            option = QuestionOption(
                question_id=question.id,
                option_text=option_data.option_text,
                option_image_url=option_data.option_image_url,
                option_image_public_id=option_data.option_image_public_id,
                is_correct=option_data.is_correct,
                order_number=option_data.order_number,
            )
            self.db.add(option)

        self.db.commit()
        self.db.refresh(question)
        return question

    def list_questions(self, exam_id: str) -> List[Question]:
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        questions = (
            self.db.query(Question)
            .filter(Question.exam_id == exam_id)
            .order_by(Question.order_number.asc())
            .all()
        )
        return questions

    def get_question(self, question_id: str) -> Question:
        question = self.db.query(Question).filter(Question.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        return question

    def update_question(self, question_id: str, payload: QuestionUpdate) -> Question:
        question = self.db.query(Question).filter(Question.id == question_id).first()
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

        if payload.question_image_public_id is not None:
            old_image_public_id = question.question_image_public_id
            new_image_public_id = payload.question_image_public_id
            
            if old_image_public_id and old_image_public_id != new_image_public_id:
                try:
                    cloudinary.uploader.destroy(old_image_public_id)
                except Exception as e:
                    print(f"Failed to delete old question image: {str(e)}")

        update_data = payload.model_dump(exclude_unset=True, exclude={"options"})
        for field, value in update_data.items():
            setattr(question, field, value)

        if payload.options is not None:
            correct_options = [opt for opt in payload.options if opt.is_correct]
            if len(correct_options) != 1:
                raise HTTPException(
                    status_code=400,
                    detail="Exactly one option must be marked as correct"
                )

            old_options = self.db.query(QuestionOption).filter(QuestionOption.question_id == question_id).all()
            old_image_public_ids = {opt.option_image_public_id for opt in old_options if opt.option_image_public_id}
            
            new_image_public_ids = {opt.option_image_public_id for opt in payload.options if opt.option_image_public_id}
            
            images_to_delete = old_image_public_ids - new_image_public_ids
            for public_id in images_to_delete:
                if public_id:
                    try:
                        cloudinary.uploader.destroy(public_id)
                    except Exception as e:
                        print(f"Failed to delete old option image: {str(e)}")

            self.db.query(QuestionOption).filter(QuestionOption.question_id == question_id).delete()

            for option_data in payload.options:
                option = QuestionOption(
                    question_id=question_id,
                    option_text=option_data.option_text,
                    option_image_url=option_data.option_image_url,
                    option_image_public_id=option_data.option_image_public_id,
                    is_correct=option_data.is_correct,
                    order_number=option_data.order_number,
                )
                self.db.add(option)

        self.db.commit()
        self.db.refresh(question)
        return question

    def delete_question(self, question_id: str) -> None:
        question = self.db.query(Question).filter(Question.id == question_id).first()
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

        if question.question_image_public_id:
            try:
                cloudinary.uploader.destroy(question.question_image_public_id)
            except Exception as e:
                print(f"Failed to delete question image: {str(e)}")

        for option in question.options:
            if option.option_image_public_id:
                try:
                    cloudinary.uploader.destroy(option.option_image_public_id)
                except Exception as e:
                    print(f"Failed to delete option image: {str(e)}")

        self.db.delete(question)
        self.db.commit()

    async def import_questions_csv(self, exam_id: str, file: UploadFile):
        exam = self.db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")

        course = self.db.query(Course).filter(Course.id == exam.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        grade = course.grade
        has_five_options = grade in [12, 13]

        try:
            content = await file.read()
            decoded = content.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded))

            max_order = self.db.query(Question).filter(Question.exam_id == exam_id).count()

            questions_created = 0
            errors = []

            for idx, row in enumerate(csv_reader, start=1):
                try:
                    required_fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
                    missing_fields = [f for f in required_fields if f not in row or not row[f].strip()]
                    
                    if missing_fields:
                        errors.append(f"Row {idx}: Missing fields: {', '.join(missing_fields)}")
                        continue

                    correct_answer = row['correct_answer'].strip().upper()

                    # option_e is always optional: use it only when the column exists and has content
                    option_e_value = row.get('option_e', '').strip()
                    row_has_five = bool(option_e_value)

                    valid_answers = ['A', 'B', 'C', 'D', 'E'] if row_has_five else ['A', 'B', 'C', 'D']
                    if correct_answer not in valid_answers:
                        errors.append(f"Row {idx}: correct_answer must be one of {', '.join(valid_answers)}")
                        continue

                    question = Question(
                        exam_id=exam_id,
                        question_text=row['question_text'].strip(),
                        explanation=row.get('explanation', '').strip() or None,
                        order_number=max_order + questions_created + 1,
                    )
                    self.db.add(question)
                    self.db.flush()

                    options_data = [
                        ('A', row['option_a'].strip(), 1),
                        ('B', row['option_b'].strip(), 2),
                        ('C', row['option_c'].strip(), 3),
                        ('D', row['option_d'].strip(), 4),
                    ]
                    
                    if row_has_five:
                        options_data.append(('E', row['option_e'].strip(), 5))

                    for letter, text, order in options_data:
                        option = QuestionOption(
                            question_id=question.id,
                            option_text=text,
                            is_correct=(letter == correct_answer),
                            order_number=order,
                        )
                        self.db.add(option)

                    questions_created += 1

                except Exception as e:
                    errors.append(f"Row {idx}: {str(e)}")
                    continue

            self.db.commit()

            return {
                "message": f"Successfully imported {questions_created} questions",
                "questions_created": questions_created,
                "errors": errors if errors else None
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")
