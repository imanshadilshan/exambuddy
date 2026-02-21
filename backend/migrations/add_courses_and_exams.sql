-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY,
    title VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    grade INTEGER NOT NULL,
    image_url VARCHAR NOT NULL,
    image_public_id VARCHAR NULL,
    price INTEGER NOT NULL DEFAULT 0,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject);
CREATE INDEX IF NOT EXISTS idx_courses_grade ON courses(grade);

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    image_url VARCHAR NOT NULL,
    image_public_id VARCHAR NULL,
    description TEXT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    total_questions INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);
