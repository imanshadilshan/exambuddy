-- Make image_url nullable for both courses and exams (optional image uploads)

ALTER TABLE courses
    ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE exams
    ALTER COLUMN image_url DROP NOT NULL;
