"""
Database migration script to create questions tables
Run this script to create the questions and question_options tables
"""
import asyncio
from sqlalchemy import create_engine, text
from app.config import settings

def run_migration():
    """Create questions and question_options tables"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL, echo=True)
    
    # SQL statements
    sql_statements = [
        """
        CREATE TABLE IF NOT EXISTS questions (
            id VARCHAR PRIMARY KEY,
            exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            question_text TEXT NOT NULL,
            question_image_url VARCHAR,
            question_image_public_id VARCHAR,
            explanation TEXT,
            order_number INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS question_options (
            id VARCHAR PRIMARY KEY,
            question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            option_text TEXT,
            option_image_url VARCHAR,
            option_image_public_id VARCHAR,
            is_correct BOOLEAN NOT NULL DEFAULT FALSE,
            order_number INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);",
        "CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(exam_id, order_number);",
        "CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);",
        "CREATE INDEX IF NOT EXISTS idx_question_options_order ON question_options(question_id, order_number);",
    ]
    
    try:
        with engine.connect() as conn:
            for sql in sql_statements:
                print(f"\nExecuting: {sql[:50]}...")
                conn.execute(text(sql))
                conn.commit()
        
        print("\n✅ Migration completed successfully!")
        print("   - Created 'questions' table")
        print("   - Created 'question_options' table")
        print("   - Created indexes for better performance")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        engine.dispose()

if __name__ == "__main__":
    print("Starting database migration...")
    run_migration()
