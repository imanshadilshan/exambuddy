-- Create questions and question_options tables
-- Run this migration to add question management functionality

-- Create questions table
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

-- Create question_options table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(exam_id, order_number);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_order ON question_options(question_id, order_number);

-- Add comment
COMMENT ON TABLE questions IS 'MCQ questions for exams';
COMMENT ON TABLE question_options IS 'Multiple choice options for questions';
