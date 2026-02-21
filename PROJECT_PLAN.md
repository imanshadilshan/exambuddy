# ExamBuddy - Complete Implementation Plan

## 📋 Project Overview
Educational platform for O/L and A/L students with MCQ papers, ranking system, and payment integration.

---

## 🏗️ Tech Stack
- **Backend**: Python 3.11+ with FastAPI
- **Frontend**: Next.js 14+ (App Router) with TypeScript
- **State Management**: Redux Toolkit
- **UI Components**: Radix UI
- **Database**: PostgreSQL (Neon DB)
- **ORM**: SQLAlchemy with Alembic for migrations
- **Cache**: Redis (for rankings and sessions)
- **Authentication**: JWT tokens
- **Payment**: PayHere (Sri Lankan gateway) + Bank slip upload with admin verification
- **File Storage**: Cloudinary (images, PDFs, receipts)
- **Task Queue**: Celery with Redis

---

## 📁 Phase 1: Project Structure Setup

### Backend Structure (FastAPI)
```
backend/
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment configuration
│   ├── database.py             # Database connection
│   ├── dependencies.py         # Shared dependencies
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── admin.py
│   │   ├── subject.py
│   │   ├── paper.py
│   │   ├── question.py
│   │   ├── answer.py
│   │   ├── attempt.py
│   │   ├── payment.py
│   │   ├── todo.py
│   │   └── ranking.py
│   │
│   ├── schemas/                # Pydantic schemas (DTOs)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── auth.py
│   │   ├── paper.py
│   │   ├── question.py
│   │   ├── attempt.py
│   │   ├── payment.py
│   │   ├── todo.py
│   │   └── ranking.py
│   │
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Login, Register, Refresh
│   │   │   ├── students.py     # Student operations
│   │   │   ├── admin.py        # Admin operations
│   │   │   ├── subjects.py     # Subject management
│   │   │   ├── papers.py       # Paper management
│   │   │   ├── questions.py    # Question management
│   │   │   ├── attempts.py     # Exam attempts
│   │   │   ├── payments.py     # Payment processing
│   │   │   ├── rankings.py     # Ranking system
│   │   │   ├── todos.py        # Todo management
│   │   │   └── analytics.py    # Reports & analytics
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── student_service.py
│   │   ├── paper_service.py
│   │   ├── exam_service.py
│   │   ├── payment_service.py
│   │   ├── ranking_service.py
│   │   ├── todo_service.py
│   │   ├── notification_service.py
│   │   └── analytics_service.py
│   │
│   ├── core/                   # Core utilities
│   │   ├── __init__.py
│   │   ├── security.py         # Password hashing, JWT
│   │   ├── permissions.py      # Permission checks
│   │   ├── exceptions.py       # Custom exceptions
│   │   └── middleware.py       # Custom middleware
│   │
│   ├── utils/                  # Helper functions
│   │   ├── __init__.py
│   │   ├── email.py
│   │   ├── file_upload.py      # Cloudinary integration
│   │   ├── validators.py
│   │   └── helpers.py
│   │
│   └── tasks/                  # Background tasks
│       ├── __init__.py
│       ├── celery_app.py
│       ├── ranking_tasks.py
│       └── notification_tasks.py
│
├── tests/                      # Unit & integration tests
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_students.py
│   └── test_exams.py
│
├── .env.example
├── .gitignore
├── requirements.txt
├── alembic.ini
└── README.md
```

### Frontend Structure (Next.js)
```
frontend/
├── public/
│   ├── images/
│   └── fonts/
│
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/             # Auth routes group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── payment/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (student)/          # Student routes group
│   │   │   ├── layout.tsx      # Student layout with sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── papers/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── exam/
│   │   │   │   └── [attemptId]/
│   │   │   │       └── page.tsx
│   │   │   ├── results/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── rankings/
│   │   │   │   └── page.tsx
│   │   │   ├── todos/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   │
│   │   └── (admin)/            # Admin routes group
│   │       ├── layout.tsx      # Admin layout
│   │       ├── dashboard/
│   │       │   └── page.tsx
│   │       ├── students/
│   │       │   └── page.tsx
│   │       ├── subjects/
│   │       │   └── page.tsx
│   │       ├── papers/
│   │       │   ├── page.tsx
│   │       │   ├── create/
│   │       │   │   └── page.tsx
│   │       │   └── [id]/
│   │       │       └── edit/
│   │       │           └── page.tsx
│   │       ├── questions/
│   │       │   └── page.tsx
│   │       ├── payments/
│   │       │   └── page.tsx
│   │       ├── analytics/
│   │       │   └── page.tsx
│   │       └── todos/
│   │           └── page.tsx
│   │
│   ├── components/             # Reusable components
│   │   ├── ui/                 # Radix UI wrapper components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── PaperCard.tsx
│   │   │   ├── ExamTimer.tsx
│   │   │   ├── QuestionDisplay.tsx
│   │   │   ├── AnswerOptions.tsx
│   │   │   ├── ResultSummary.tsx
│   │   │   ├── RankingTable.tsx
│   │   │   └── TodoList.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── StudentTable.tsx
│   │   │   ├── PaymentVerification.tsx
│   │   │   ├── PaperForm.tsx
│   │   │   ├── QuestionForm.tsx
│   │   │   ├── BulkUpload.tsx
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   └── AdminTodoList.tsx
│   │   │
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── Pagination.tsx
│   │       └── SearchBar.tsx
│   │
│   ├── lib/                    # Core libraries
│   │   ├── redux/
│   │   │   ├── store.ts
│   │   │   ├── hooks.ts
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.ts
│   │   │   │   ├── studentSlice.ts
│   │   │   │   ├── paperSlice.ts
│   │   │   │   ├── examSlice.ts
│   │   │   │   ├── rankingSlice.ts
│   │   │   │   └── todoSlice.ts
│   │   │   └── middleware/
│   │   │       └── api.ts
│   │   │
│   │   ├── api/                # API client
│   │   │   ├── client.ts       # Axios instance
│   │   │   ├── auth.ts
│   │   │   ├── students.ts
│   │   │   ├── papers.ts
│   │   │   ├── exams.ts
│   │   │   ├── payments.ts
│   │   │   ├── rankings.ts
│   │   │   └── todos.ts
│   │   │
│   │   └── utils/
│   │       ├── validators.ts
│   │       ├── formatters.ts
│   │       ├── constants.ts
│   │       └── helpers.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useExam.ts
│   │   ├── useTimer.ts
│   │   ├── useLocalStorage.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── user.ts
│   │   ├── paper.ts
│   │   ├── question.ts
│   │   ├── exam.ts
│   │   ├── payment.ts
│   │   ├── ranking.ts
│   │   └── todo.ts
│   │
│   └── styles/
│       └── globals.css
│
├── .env.local.example
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

---

## 📊 Phase 2: Database Schema Design

### Core Tables

#### 1. Users (Base Table)
```sql
users
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── role (ENUM: 'student', 'admin')
├── is_active (BOOLEAN, default: false)
├── is_verified (BOOLEAN, default: false)
├── last_login (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 2. Students
```sql
students
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── full_name (VARCHAR)
├── phone_number (VARCHAR)
├── school (VARCHAR)
├── district (VARCHAR)
├── grade (INTEGER: 10, 11, 12, 13)
├── profile_photo_url (VARCHAR, nullable) -- Cloudinary URL
├── has_paid (BOOLEAN, default: false)
├── payment_verified_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 3. Admins
```sql
admins
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── full_name (VARCHAR)
├── permissions (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 4. Subjects
```sql
subjects
├── id (UUID, PK)
├── name (VARCHAR)
├── code (VARCHAR, UNIQUE)
├── level (ENUM: 'OL', 'AL')
├── stream (VARCHAR, nullable for OL)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 5. Papers
```sql
papers
├── id (UUID, PK)
├── subject_id (UUID, FK -> subjects.id)
├── title (VARCHAR)
├── year (INTEGER)
├── grade (INTEGER: 10, 11, 12, 13)
├── duration_minutes (INTEGER)
├── total_marks (INTEGER)
├── is_published (BOOLEAN, default: false)
├── published_at (TIMESTAMP)
├── created_by (UUID, FK -> users.id)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 6. Questions
```sql
questions
├── id (UUID, PK)
├── paper_id (UUID, FK -> papers.id)
├── question_number (INTEGER)
├── question_text (TEXT)
├── question_image_url (VARCHAR, nullable) -- Cloudinary URL
├── marks (INTEGER, default: 1)
├── explanation (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 7. Answer_Options
```sql
answer_options
├── id (UUID, PK)
├── question_id (UUID, FK -> questions.id)
├── option_letter (CHAR: A, B, C, D, E)
├── option_text (TEXT)
├── option_image_url (VARCHAR, nullable) -- Cloudinary URL
├── is_correct (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 8. Attempts (Exam Sessions)
```sql
attempts
├── id (UUID, PK)
├── student_id (UUID, FK -> students.id)
├── paper_id (UUID, FK -> papers.id)
├── started_at (TIMESTAMP)
├── submitted_at (TIMESTAMP, nullable)
├── duration_seconds (INTEGER)
├── score (DECIMAL, nullable)
├── total_marks (INTEGER)
├── percentage (DECIMAL, nullable)
├── status (ENUM: 'in_progress', 'submitted', 'abandoned')
├── session_data (JSONB) -- for recovery
├── device_fingerprint (VARCHAR)
└── created_at (TIMESTAMP)
```

#### 9. Student_Answers
```sql
student_answers
├── id (UUID, PK)
├── attempt_id (UUID, FK -> attempts.id)
├── question_id (UUID, FK -> questions.id)
├── selected_option_id (UUID, FK -> answer_options.id)
├── is_correct (BOOLEAN)
├── time_spent_seconds (INTEGER)
├── answered_at (TIMESTAMP)
└── created_at (TIMESTAMP)
```

#### 10. Payments
```sql
payments
├── id (UUID, PK)
├── student_id (UUID, FK -> students.id)
├── amount (DECIMAL)
├── currency (VARCHAR, default: 'LKR')
├── payment_method (ENUM: 'card', 'mobile', 'bank_transfer')
├── transaction_id (VARCHAR, nullable)
├── receipt_url (VARCHAR, nullable) -- Cloudinary URL for bank slips
├── status (ENUM: 'pending', 'verified', 'rejected')
├── verified_by (UUID, FK -> admins.id, nullable)
├── verified_at (TIMESTAMP, nullable)
├── notes (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 11. Rankings
```sql
rankings
├── id (UUID, PK)
├── student_id (UUID, FK -> students.id)
├── paper_id (UUID, FK -> papers.id)
├── attempt_id (UUID, FK -> attempts.id)
├── score (DECIMAL)
├── duration_seconds (INTEGER)
├── overall_rank (INTEGER)
├── district_rank (INTEGER)
├── district (VARCHAR)
├── calculated_at (TIMESTAMP)
└── created_at (TIMESTAMP)

Indexes:
- paper_id, score DESC, duration_seconds ASC (for overall ranking)
- paper_id, district, score DESC, duration_seconds ASC (for district ranking)
```

#### 12. Todos
```sql
todos
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── title (VARCHAR)
├── description (TEXT, nullable)
├── priority (ENUM: 'high', 'medium', 'low')
├── category (VARCHAR, nullable)
├── due_date (TIMESTAMP, nullable)
├── reminder_at (TIMESTAMP, nullable)
├── is_completed (BOOLEAN, default: false)
├── completed_at (TIMESTAMP, nullable)
├── is_system_generated (BOOLEAN, default: false)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### 13. Active_Sessions
```sql
active_sessions
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── device_fingerprint (VARCHAR)
├── session_token (VARCHAR, UNIQUE)
├── ip_address (VARCHAR)
├── user_agent (TEXT)
├── last_activity (TIMESTAMP)
├── expires_at (TIMESTAMP)
└── created_at (TIMESTAMP)

Note: Only one active session per user
```

#### 14. Notifications
```sql
notifications
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── title (VARCHAR)
├── message (TEXT)
├── type (ENUM: 'info', 'success', 'warning', 'system')
├── is_read (BOOLEAN, default: false)
├── read_at (TIMESTAMP, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

---

## 🔧 Phase 3: Backend Implementation Steps

### Step 3.1: Initial Setup
1. Create virtual environment
2. Install FastAPI and dependencies
3. Setup environment configuration (.env)
4. Configure database connection (Neon PostgreSQL)
5. Configure Cloudinary (cloud_name, api_key, api_secret)
6. Setup Alembic for migrations

### Step 3.2: Authentication & Authorization
1. Implement JWT token generation and validation
2. Password hashing with bcrypt
3. Role-based access control (RBAC)
4. Session management (single device login)
5. Middleware for authentication

### Step 3.3: Core Models & Schemas
1. Create SQLAlchemy models for all tables
2. Create Pydantic schemas for request/response
3. Setup database relationships
4. Create initial migration

### Step 3.4: API Endpoints Development

**Authentication APIs:**
- POST /api/v1/auth/register (Student registration)
- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/refresh-token
- GET /api/v1/auth/me

**Student APIs:**
- GET /api/v1/students/profile
- PUT /api/v1/students/profile
- GET /api/v1/students/papers (filtered by grade)
- GET /api/v1/students/attempts
- GET /api/v1/students/rankings/{paper_id}

**Paper & Exam APIs:**
- GET /api/v1/papers (student - accessible papers)
- GET /api/v1/papers/{id}
- POST /api/v1/attempts (start exam)
- PUT /api/v1/attempts/{id}/answer (save answer)
- POST /api/v1/attempts/{id}/submit
- GET /api/v1/attempts/{id}/result
- GET /api/v1/attempts/{id}/review

**Payment APIs:**
- POST /api/v1/payments/initiate (Create payment - PayHere or bank transfer)
- POST /api/v1/payments/upload-receipt (Upload bank slip)
- POST /api/v1/payments/notify (PayHere webhook callback)
- GET /api/v1/payments/status

**Ranking APIs:**
- GET /api/v1/rankings/{paper_id}/overall
- GET /api/v1/rankings/{paper_id}/district
- GET /api/v1/rankings/student/{student_id}

**Todo APIs:**
- GET /api/v1/todos
- POST /api/v1/todos
- PUT /api/v1/todos/{id}
- DELETE /api/v1/todos/{id}
- PATCH /api/v1/todos/{id}/complete

**Admin APIs:**
- GET /api/v1/admin/students
- PATCH /api/v1/admin/students/{id}/verify-payment
- POST /api/v1/admin/subjects
- GET /api/v1/admin/subjects
- POST /api/v1/admin/papers
- PUT /api/v1/admin/papers/{id}
- POST /api/v1/admin/questions/bulk-upload
- GET /api/v1/admin/analytics/overview
- GET /api/v1/admin/analytics/export
- POST /api/v1/admin/notifications/push
- GET /api/v1/admin/todos

### Step 3.5: Business Logic Services
1. **AuthService**: Login, registration, token management
2. **ExamService**: Exam logic, timer, auto-save, recovery
3. **RankingService**: Calculate ranks with Redis caching
4. **PaymentService**: Payment processing & verification
5. **NotificationService**: Push notifications
6. **AnalyticsService**: Generate reports

### Step 3.6: File Upload with Cloudinary
1. Configure Cloudinary SDK with credentials
2. Create upload utility functions:
   - `upload_image()`: For question images, profile photos
   - `upload_pdf()`: For question papers, receipts
   - `upload_receipt()`: Specific for payment receipts
3. Implement file validation (type, size, format)
4. Generate secure URLs with expiration
5. Implement file deletion for cleanup
6. Create folder structure: `/receipts`, `/questions`, `/profiles`, `/papers`

### Step 3.7: Security Implementation
1. Device fingerprinting
2. Session validation middleware
3. Rate limiting
4. Input validation and sanitization
5. CORS configuration

### Step 3.8: Background Tasks
1. Setup Celery with Redis
2. Ranking recalculation tasks
3. Notification sending tasks
4. Auto-generated todo tasks

---

## 🎨 Phase 4: Frontend Implementation Steps

### Step 4.1: Initial Setup
1. Create Next.js project with TypeScript
2. Install dependencies (Redux, Radix, Tailwind)
3. Configure Tailwind CSS
4. Setup folder structure

### Step 4.2: State Management
1. Configure Redux Toolkit store
2. Create slices for each domain
3. Setup API middleware
4. Implement persistence (local storage for recovery)

### Step 4.3: API Client Setup
1. Configure Axios instance with interceptors
2. Implement token refresh logic
3. Create API functions for all endpoints
4. Error handling wrapper

### Step 4.4: UI Components (Radix)
1. Create wrapper components for Radix primitives
2. Style with Tailwind CSS
3. Build reusable UI library
4. Accessibility compliance

### Step 4.5: Authentication Flow
1. Login page
2. Registration form with stepper
3. Payment page
4. Protected route wrapper
5. Session management

### Step 4.6: Student Portal
1. **Dashboard**: Overview, recent papers, rankings
2. **Papers List**: Filterable by subject, year
3. **Exam Interface**:
   - Timer component
   - Question navigation
   - Answer selection
   - Auto-save every 30 seconds
   - Recovery on refresh
   - Submit confirmation
4. **Results Page**: Score, review, explanations
5. **Rankings Page**: Overall & district tables
6. **Todo List**: CRUD operations, categories, reminders
7. **Profile Page**: Edit details

### Step 4.7: Admin Portal
1. **Dashboard**: Stats, pending tasks
2. **Student Management**: Table with filters, payment verification
3. **Subject Management**: CRUD operations
4. **Paper Management**: Create, edit, publish
5. **Question Management**: Bulk upload (CSV/JSON)
6. **Payment Verification**: Review receipts, approve/reject
7. **Analytics**: Charts, export PDF reports
8. **Admin Todos**: Task management
9. **Notifications**: Send push notifications

### Step 4.8: Security Features (Frontend)
1. Disable right-click (context menu)
2. Disable screenshot keys (print screen)
3. Visibility API for tab focus detection
4. Session validation on route change
5. Auto-logout on multiple sessions

### Step 4.9: Exam Recovery Logic
1. Store attempt data in Redux + localStorage
2. Detect browser refresh
3. Resume API call with saved state
4. Restore timer and answers

---

## 🔒 Phase 5: Security Implementation

### Backend Security
- [ ] JWT with short expiry (15 min) + refresh tokens (7 days)
- [ ] Password validation (min 8 chars, complexity)
- [ ] Rate limiting (login attempts, API calls)
- [ ] SQL injection prevention (ORM)
- [ ] XSS protection (input sanitization)
- [ ] CSRF tokens for state-changing operations
- [ ] HTTPS enforcement
- [ ] Secure headers (Helmet equivalent)

### Frontend Security
- [ ] Disable DevTools in production
- [ ] Prevent screenshots (CSS + JS)
- [ ] Disable copy/paste in exam
- [ ] Watermark student name on exam pages
- [ ] Token storage in httpOnly cookies (if possible) or secure localStorage
- [ ] Input validation on forms
- [ ] CSP (Content Security Policy)

### Session Management
- [ ] Single device login check
- [ ] Device fingerprinting (browser, OS, IP)
- [ ] Session invalidation on new login
- [ ] Active session tracking in DB

---

## 💳 Phase 6: Payment Integration

### Payment Flow
1. Student initiates payment
2. Choose method:
   - **Online Payment**: Redirect to PayHere gateway (Card/Mobile/Bank)
   - **Bank Transfer**: Upload bank slip receipt image
3. Backend stores payment record (status: pending)
4. **For Online Payment**:
   - PayHere sends notification to webhook
   - Auto-verify if payment successful
   - Activate account automatically
5. **For Bank Transfer**:
   - Admin reviews uploaded slip
   - Admin approves/rejects payment
   - Account activated on approval
6. Student receives notification

### Implementation
- **PayHere Integration**:
  - Generate payment hash using MD5(merchant_id + order_id + amount + currency + merchant_secret)
  - POST to PayHere checkout: `https://sandbox.payhere.lk/pay/checkout` (sandbox) or `https://www.payhere.lk/pay/checkout` (live)
  - Handle notify callback (server-to-server)
  - Verify payment signature on callback
- **Bank Slip Upload**:
  - Upload to Cloudinary
  - Store receipt_url in payments table
  - Admin dashboard for verification
  - Email notification to admin on new upload
- **Account Activation**:
  - Set `student.has_paid = True`
  - Set `student.payment_verified_at = NOW()`
  - Set `user.is_active = True`
  - Send success notification to student

---

## 📈 Phase 7: Ranking System

### Ranking Logic
1. After exam submission, calculate score
2. Store in `rankings` table
3. Trigger background task to recalculate ranks
4. Use Redis for caching top 100 ranks
5. Rank calculation:
   - PRIMARY: Score (DESC)
   - SECONDARY: Duration (ASC)
6. Calculate both overall and district-wise

### Implementation
- Celery task for rank calculation
- Redis caching with TTL
- SQL query with RANK() window function
- WebSocket for real-time rank updates (optional)

---

## 📱 Phase 8: Exam Engine Details

### Features
- [ ] Timer starts automatically
- [ ] Auto-save every 30 seconds
- [ ] Navigation between questions
- [ ] Mark for review
- [ ] Warning before submit
- [ ] Cannot go back after submit
- [ ] Show results immediately
- [ ] Review with explanations

### Recovery Logic
```javascript
// Frontend
onMount: Check localStorage for active attempt
if (activeAttempt) {
  API: GET /attempts/{id}/recover
  Restore: answers, timeRemaining
}

// Backend
Store session_data JSONB:
{
  "answers": {...},
  "time_remaining": 1800,
  "last_question": 15
}
```

---

## 📊 Phase 9: Analytics & Reporting

### Admin Analytics
1. Total students registered
2. Total students paid
3. Papers attempted count
4. Average scores per paper
5. Top performers
6. District-wise distribution
7. Payment pending list

### Export Features
- PDF reports with charts
- CSV export for student data
- Filter by date range, grade, subject

---

## ✅ Phase 10: Testing & Deployment

### Testing
1. Unit tests (pytest for backend)
2. Integration tests (API endpoints)
3. Frontend component tests (Jest + React Testing Library)
4. E2E tests (Playwright)

### Deployment
1. **Backend**: 
   - Docker containerization
   - Deploy to Railway/Render/AWS EC2
   - Setup Neon PostgreSQL
   - Redis Cloud for caching
   
2. **Frontend**:
   - Deploy to Vercel/Netlify
   - Environment variables setup
   - Domain configuration

3. **CI/CD**:
   - GitHub Actions
   - Automated testing
   - Auto-deployment on main branch

---

## 📦 Dependencies

### Backend (requirements.txt)
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis==5.0.1
celery==5.3.4
cloudinary==1.38.0
requests==2.31.0
python-dotenv==1.0.0
httpx==0.26.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.1.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "axios": "^1.6.5",
    "tailwindcss": "^3.4.1",
    "zod": "^3.22.4",
    "date-fns": "^3.2.0"
  }
}
```

---

## 🎯 Implementation Timeline

### Week 1-2: Foundation
- Database schema design
- Backend boilerplate setup
- Frontend boilerplate setup
- Authentication system

### Week 3-4: Core Features
- Student registration & payment
- Admin panel basics
- Subject & paper management
- Question CRUD

### Week 5-6: Exam Engine
- Exam interface
- Timer logic
- Auto-save & recovery
- Result calculation

### Week 7-8: Rankings & Advanced
- Ranking system
- Todo lists
- Analytics dashboard
- Bulk upload

### Week 9-10: Polish & Testing
- Security hardening
- Testing all flows
- Bug fixes
- Performance optimization

### Week 11-12: Deployment
- Production setup
- Monitoring
- Documentation
- Launch

---

## 🔄 Grade-Based Access Matrix

| Grade | Can Access Papers For |
|-------|----------------------|
| 10    | Grade 10 only        |
| 11    | Grades 10, 11        |
| 12    | Grade 12 only        |
| 13    | Grades 12, 13        |

**Implementation**: Filter in SQL query based on student's grade

---

## ⚙️ Environment Configuration

### Backend (.env)
```bash
# Application
APP_NAME=ExamBuddy
APP_ENV=development
DEBUG=True
SECRET_KEY=your-secret-key-here
API_V1_PREFIX=/api/v1

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname
DB_ECHO=False

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=exambuddy

# Payment Integration (PayHere - Sri Lanka)
PAYHERE_MERCHANT_ID=your-merchant-id
PAYHERE_MERCHANT_SECRET=your-merchant-secret
PAYHERE_NOTIFY_URL=https://yourdomain.com/api/v1/payments/notify
PAYHERE_RETURN_URL=https://yourdomain.com/payment/success
PAYHERE_CANCEL_URL=https://yourdomain.com/payment/cancel
PAYHERE_MODE=sandbox
PAYHERE_CURRENCY=LKR

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@exambuddy.com

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ExamBuddy

# Payment Integration (PayHere)
NEXT_PUBLIC_PAYHERE_MERCHANT_ID=your-merchant-id
NEXT_PUBLIC_PAYHERE_MODE=sandbox

# Cloudinary (for direct uploads from frontend if needed)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=exambuddy_preset
```

### Cloudinary Setup Instructions
1. Create account at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard
3. Create upload preset for unsigned uploads (if needed)
4. Configure folders: `/receipts`, `/questions`, `/profiles`
5. Set file size limits and allowed formats:
   - Images: JPG, PNG, WEBP (max 5MB)
   - PDFs: max 10MB
   - Receipts: JPG, PNG, PDF (max 5MB)

---

## 📝 Notes

1. **Mobile App**: The current plan focuses on web. Flutter/React Native can be added later with same backend APIs.

2. **Scalability**: Redis caching and Celery tasks ensure the system can handle high traffic.

3. **Security**: Multi-layered security with JWT, session management, and content protection.

4. **User Experience**: Auto-save and recovery ensure students never lose progress.

5. **Admin Efficiency**: Bulk upload, analytics, and todo system streamline operations.

---

## 🚀 Next Steps

1. Review and approve this plan
2. Setup development environment
3. Create database on Neon
4. Initialize backend project
5. Initialize frontend project
6. Start with Phase 1 implementation

Would you like me to proceed with the implementation? Please confirm and I'll start building the project step by step.
