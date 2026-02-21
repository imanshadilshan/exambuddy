-- Add profile_photo_public_id column to students table
-- This stores the Cloudinary public_id for profile photos

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS profile_photo_public_id VARCHAR;

-- Note: This column will be used later for Cloudinary image management
-- (deletion, transformation, etc.) when photo upload feature is implemented
