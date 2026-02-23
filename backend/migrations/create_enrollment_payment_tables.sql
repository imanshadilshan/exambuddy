-- Create enrollment and payment system tables

-- Create enrollment status enum
CREATE TYPE enrollment_status AS ENUM ('active', 'expired', 'suspended');

-- Create payment method enum
CREATE TYPE payment_method AS ENUM ('payhere', 'bank_slip', 'free');

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create payment type enum
CREATE TYPE payment_type AS ENUM ('course', 'exam');

-- Create bank slip status enum
CREATE TYPE bank_slip_status AS ENUM ('pending', 'verified', 'rejected');

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_type payment_type NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    payment_method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payhere_order_id VARCHAR,
    payhere_payment_id VARCHAR,
    transaction_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create exam_enrollments table
CREATE TABLE IF NOT EXISTS exam_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create bank_slips table
CREATE TABLE IF NOT EXISTS bank_slips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slip_image_url VARCHAR NOT NULL,
    slip_image_public_id VARCHAR,
    bank_name VARCHAR,
    depositor_name VARCHAR,
    deposit_date TIMESTAMP WITH TIME ZONE,
    reference_number VARCHAR,
    status bank_slip_status NOT NULL DEFAULT 'pending',
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payhere_order_id ON payments(payhere_order_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_enrollments_user_id ON exam_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_enrollments_exam_id ON exam_enrollments(exam_id);
CREATE INDEX IF NOT EXISTS idx_bank_slips_payment_id ON bank_slips(payment_id);
CREATE INDEX IF NOT EXISTS idx_bank_slips_user_id ON bank_slips(user_id);

-- Add unique constraint to prevent duplicate enrollments
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_course_enrollment ON course_enrollments(user_id, course_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_exam_enrollment ON exam_enrollments(user_id, exam_id) WHERE status = 'active';
