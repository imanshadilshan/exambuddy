-- For existing databases where courses/exams tables were already created
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS image_url VARCHAR,
    ADD COLUMN IF NOT EXISTS image_public_id VARCHAR,
    ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

UPDATE courses SET image_url = '' WHERE image_url IS NULL;
UPDATE courses SET price = 0 WHERE price IS NULL;

ALTER TABLE courses
    ALTER COLUMN image_url SET NOT NULL,
    ALTER COLUMN price SET NOT NULL;

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS image_url VARCHAR,
    ADD COLUMN IF NOT EXISTS image_public_id VARCHAR;

UPDATE exams SET image_url = '' WHERE image_url IS NULL;

ALTER TABLE exams
    ALTER COLUMN image_url SET NOT NULL;
