# ExamBuddy - Online Examination Platform

A comprehensive full-stack educational platform for managing online exams, courses, and student assessments. Built with **FastAPI** (Backend) and **Next.js** (Frontend).

## 🚀 Features

- **Student Portal**: Browse courses, enroll in exams, take timed assessments, view results and rankings
- **Admin Dashboard**: Manage students, courses, exams, questions, payments, and analytics
- **Payment Integration**: PayHere (Sri Lanka) and manual bank slip verification
- **Real-time Sessions**: Redis-based session management and caching (Upstash serverless)
- **File Management**: Cloudinary integration for profile photos and document uploads
- **Authentication**: JWT-based secure authentication with refresh tokens and Google OAuth
- **Exam Engine**: Timed exams, multiple choice questions, automatic grading
- **Serverless Infrastructure**: Neon PostgreSQL for database, Upstash Redis for cache/sessions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)

**Cloud Services (Free Tier Available):**
- **Neon DB** - [Sign up](https://neon.tech) (serverless PostgreSQL)
- **Upstash Redis** - [Sign up](https://upstash.com) (serverless Redis)
- **Cloudinary** - [Sign up](https://cloudinary.com) (file uploads)
- **PayHere** - [Sign up](https://www.payhere.lk/merchant/) (optional, payment processor)

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/imanshadilshan/exambuddy
cd exambuddy
```

---

## 📦 Backend Setup (FastAPI)

### Step 1: Create Virtual Environment

```bash
cd backend
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials. **Required variables:**

```env
# Application Settings
SECRET_KEY=your-secret-key-min-32-characters-long
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars
APP_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Redis Cache & Celery (Upstash recommended for serverless)
REDIS_URL=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379

# Celery Background Tasks
CELERY_BROKER_URL=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379/0
CELERY_RESULT_BACKEND=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379/0

# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# PayHere Payment Gateway (Optional)
PAYHERE_MERCHANT_ID=your-merchant-id
PAYHERE_MERCHANT_SECRET=your-merchant-secret
PAYHERE_MODE=sandbox

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 4: Set Up Database

The application **automatically creates database tables** on startup using SQLAlchemy's metadata. No manual migrations needed:

```bash
# Tables are created automatically when you run the application
# (see Step 5)
```

**Important**: The database schema is defined in `backend/app/models/` as SQLAlchemy models. These are converted to tables automatically on application startup via `Base.metadata.create_all()` in `app/main.py`.

### Step 5: Run the Backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**API Documentation:**
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Step 6: Run Background Tasks (Optional)

In a separate terminal, start the Celery worker for email and payment processing:

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

---

## 🎨 Frontend Setup (Next.js)

### Step 1: Install Dependencies

```bash
cd ../frontend
npm install
```

### Step 2: Configure Environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Step 3: Run the Frontend

```bash
npm run dev
```

The frontend will be available at: `http://localhost:3000`

---

## 🔑 Getting Your Credentials

### Neon PostgreSQL
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy the connection string and set as `DATABASE_URL`
4. Make sure string includes `sslmode=require`

### Upstash Redis
1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_URL` (format: `rediss://...`)
4. Use this URL for `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND`

### Cloudinary
1. Go to [cloudinary.com/console](https://cloudinary.com/console)
2. Copy your **Cloud Name**, **API Key**, and **API Secret**
3. Set as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### PayHere (Optional)
1. Create merchant account at [payhere.lk/merchant](https://www.payhere.lk/merchant/)
2. Copy **Merchant ID** and **Merchant Secret**
3. Use `PAYHERE_MODE=sandbox` for testing, `production` for live

### Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (Web Application)
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:8000/api/v1/auth/google/callback`
4. Copy **Client ID** and set as `GOOGLE_CLIENT_ID`

### Step 4: Create Admin User (Optional)

After starting the backend, create an admin account:

```bash
python create_master_admin.py
```

---

## 🎨 Frontend Setup (Next.js)

### Step 1: Navigate to Frontend Directory

```bash
cd ../frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
```

### Step 4: Start Development Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 🚀 Quick Start (Development)

### Terminal 1: Start Backend

```bash
cd backend
./venv/Scripts/activate  # or source venv/bin/activate on macOS/Linux
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)

### First Time Setup

1. **Create Admin Account**:
   ```bash
   cd backend
   python create_master_admin.py
   ```

2. **Login at**: http://localhost:3000/login

3. **Create Content**:
   - Admin Dashboard → Courses → Create Course
   - Add Exams to Course
   - Upload Questions
   - Verify through **Admin Panel**

4. **Test Student Flow**:
   - Register as new student
   - Enroll in course
   - Take exam and view results

---

## 📁 Project Structure

```
exambuddy/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # API endpoints (routes)
│   │   │   ├── auth.py        # Authentication endpoints
│   │   │   ├── student.py     # Student course/exam endpoints
│   │   │   ├── admin_*.py     # Admin management endpoints
│   │   │   └── payment.py     # Payment processing
│   │   ├── core/              # Core functionality
│   │   │   ├── security.py    # JWT token handling
│   │   │   ├── cache.py       # Redis caching
│   │   │   ├── session.py     # Session management
│   │   │   └── rate_limit.py  # Rate limiting
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   ├── config.py          # Configuration from environment
│   │   ├── database.py        # Database engine and session
│   │   └── main.py            # FastAPI app with startup/shutdown
│   ├── uploads/               # User file uploads
│   ├── .env                   # Environment variables (git-ignored)
│   ├── .env.example           # Environment template
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  # Next.js Frontend
│   ├── app/                   # Next.js app directory
│   │   ├── admin/            # Admin dashboard pages
│   │   ├── student/          # Student portal pages
│   │   ├── auth/             # Authentication pages
│   │   ├── payment/          # Payment pages
│   │   ├── dashboard/        # User dashboard
│   │   ├── profile/          # User profile
│   │   ├── globals.css       # Global styles
│   │   └── layout.tsx        # Root layout
│   ├── components/           # Reusable React components
│   ├── lib/                  # Utility functions
│   │   ├── api/             # API client functions
│   │   ├── redux/           # Redux state management
│   │   └── utils/           # Helper utilities
│   ├── public/              # Static assets
│   ├── .env.local           # Environment variables (git-ignored)
│   ├── .env.example         # Environment template
│   ├── package.json         # Node.js dependencies
│   ├── tsconfig.json        # TypeScript configuration
│   └── tailwind.config.ts   # Tailwind CSS configuration
│
├── LICENSE
└── README.md                # This file
```

## 🗄️ Database Schema

The application automatically creates PostgreSQL tables based on SQLAlchemy models:

- **users** - User accounts (students and admins)
- **courses** - Educational courses
- **exams** - Exam configurations with timing
- **questions** - Multiple choice questions
- **exam_attempts** - Student exam submissions
- **enrollments** - Course registrations
- **payments** - Payment records
- **admin** - Admin user extensions

Schema is initialized automatically in `app/main.py` via `Base.metadata.create_all()` on startup.

---

## 🔧 Troubleshooting

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'app'`
- **Solution**: Make sure you're in the `backend/` directory and virtual environment is activated:
  ```bash
  cd backend
  ./venv/Scripts/activate
  ```

**Issue**: Database connection error (`psycopg2.OperationalError`)
- **Solution**: Verify `DATABASE_URL` is correct in `.env`:
  - Check Neon connection string includes `sslmode=require`
  - Ensure user/password are correct
  - Verify database name is correct

**Issue**: Redis connection error
- **Solution**: If using Upstash:
  - Verify `REDIS_URL` in `.env` uses `rediss://` (TLS) format
  - Check credentials are correct
  - Verify URL hasn't expired (Upstash credentials sometimes reset)

**Issue**: Pydantic validation error on startup
- **Solution**: Check all required environment variables are set:
  ```bash
  # In backend directory, check .env has:
  - DATABASE_URL
  - REDIS_URL (or local Redis fallback)
  - SECRET_KEY and JWT_SECRET_KEY
  - FRONTEND_URL and BACKEND_URL
  - CLOUDINARY credentials
  ```

### Frontend Issues

**Issue**: `CORS Error` or `Network Error`
- **Solution**: Ensure `NEXT_PUBLIC_API_URL` in frontend `.env.local` points to backend:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```

**Issue**: Images not loading / upload fails
- **Solution**: Verify Cloudinary credentials in backend `.env`:
  ```env
  CLOUDINARY_CLOUD_NAME=your-name
  CLOUDINARY_API_KEY=your-key
  CLOUDINARY_API_SECRET=your-secret
  ```

### Database Issues

**Issue**: Tables not created on startup
- **Solution**: Tables are automatically created in `Base.metadata.create_all()`. Check backend startup logs for errors:
  ```bash
  # Look for "✅ Database tables created" in logs
  ```

---

## 🚀 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - Logout user

### Student
- `GET /api/v1/student/courses` - List available courses
- `POST /api/v1/student/enroll` - Enroll in course
- `GET /api/v1/student/exams` - List student's exams
- `POST /api/v1/student/exam/{exam_id}/start` - Start exam
- `POST /api/v1/student/exam/submit` - Submit exam answers

### Admin
- `GET /api/v1/admin/students` - List all students
- `POST /api/v1/admin/courses` - Create course
- `POST /api/v1/admin/exams` - Create exam
- `POST /api/v1/admin/questions` - Create question
- `GET /api/v1/admin/analytics` - View analytics

Full API documentation available at: **http://localhost:8000/docs** (when running)

---

## � User Roles & Permissions

### Admin
- ✅ Create and manage courses
- ✅ Create and manage exams
- ✅ Upload and manage questions
- ✅ View all students and their progress
- ✅ Manage payments and verify bank slips
- ✅ View analytics and reports
- ✅ System settings and configuration

### Student
- ✅ Browse and search courses
- ✅ Enroll in courses (free or paid)
- ✅ View course materials
- ✅ Take timed exams
- ✅ View exam results and explanations
- ✅ Check ranking/standings
- ✅ Update profile
- ✅ Make payments (PayHere or bank slip)

---

## 🚢 Production Deployment

### Environment Setup

**Backend `.env` for Production:**
```env
APP_ENV=production
DEBUG=False

# Use strong random keys (32+ characters)
SECRET_KEY=your-very-long-random-key-here
JWT_SECRET_KEY=your-very-long-random-key-here

# Production URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Production database (Neon)
DATABASE_URL=postgresql://[production-credentials]

# Production Redis (Upstash)
REDIS_URL=rediss://default:[production-key]@[production-endpoint].upstash.io:6379

# Celery with production Redis
CELERY_BROKER_URL=rediss://default:[production-key]@[production-endpoint].upstash.io:6379/0
CELERY_RESULT_BACKEND=rediss://default:[production-key]@[production-endpoint].upstash.io:6379/0

# Cloudinary
CLOUDINARY_CLOUD_NAME=[production]
CLOUDINARY_API_KEY=[production]
CLOUDINARY_API_SECRET=[production]

# PayHere live mode
PAYHERE_MODE=live
PAYHERE_MERCHANT_ID=[live-merchant-id]
PAYHERE_MERCHANT_SECRET=[live-secret]
```

### Deployment Steps

**Backend Deployment:**
```bash
# Install dependencies
pip install -r requirements.txt

# Run with production ASGI server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Frontend Deployment:**
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Recommended Hosting

- **Backend**: Render, Railway, Vercel, or AWS
- **Database**: Neon (managed PostgreSQL)
- **Redis**: Upstash (managed Redis)
- **Frontend**: Vercel, Netlify, or AWS Amplify
- **File Storage**: Cloudinary (CDN)

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Database Models**: See `backend/app/models/`
- **API Routes**: See `backend/app/api/v1/`
- **Frontend Components**: See `frontend/components/`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 Support

For issues and questions:
- Check the [Common Issues](#-common-issues--solutions) section
- Review API documentation at http://localhost:8000/docs
- Open an issue on GitHub

---

**Made with ❤️ for educational excellence**
