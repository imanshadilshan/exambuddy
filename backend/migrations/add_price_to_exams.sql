-- Add price column to exams table to support free and paid exams
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;

-- Set default value for existing records
UPDATE exams SET price = 0 WHERE price IS NULL;

-- Make column NOT NULL
ALTER TABLE exams
    ALTER COLUMN price SET NOT NULL;

-- Comment for reference: price = 0 means free exam
