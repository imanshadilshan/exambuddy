# ExamBuddy - Online Examination Platform

A comprehensive full-stack educational platform for managing online exams, courses, and student assessments. Built with FastAPI (Backend) and Next.js (Frontend).

## 🚀 Features

- **Student Portal**: Browse courses, enroll in exams, take timed assessments, view results and rankings
- **Admin Dashboard**: Manage students, courses, exams, questions, payments, and analytics
- **Payment Integration**: PayHere (Sri Lanka) and manual bank slip verification
- **Real-time Sessions**: Redis-based session management and caching
- **File Management**: Cloudinary integration for profile photos and document uploads
- **Authentication**: JWT-based secure authentication with refresh tokens
- **Exam Engine**: Timed exams, multiple choice questions, automatic grading

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Redis** - [Download](https://redis.io/download/)
- **PostgreSQL** (or Neon DB account) - [Neon](https://neon.tech/)

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/imanshadilshan/exambuddy
```

### 2️⃣ Backend Setup

#### Step 1: Create Virtual Environment

```bash
cd backend
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

#### Step 2: Install Dependencies

```bash
pip install -r requirement.txt
```

#### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file and configure the following **required** variables:

```env
# Application
SECRET_KEY=your-secret-key-min-32-characters-long
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Database (PostgreSQL/Neon)
DATABASE_URL=postgresql://user:password@host/dbname

# URLs (REQUIRED)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Redis (Upstash recommended)
REDIS_URL=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379
# Optional local fallback
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# PayHere (Optional - for online payments)
PAYHERE_MERCHANT_ID=your-merchant-id
PAYHERE_MERCHANT_SECRET=your-merchant-secret
PAYHERE_MODE=sandbox

# Celery (Background Tasks)
CELERY_BROKER_URL=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379
CELERY_RESULT_BACKEND=rediss://default:<password>@<your-upstash-endpoint>.upstash.io:6379
```

**Get Your Credentials:**
- **Neon DB**: [console.neon.tech](https://console.neon.tech/) - Create database and copy connection string
- **Cloudinary**: [cloudinary.com/console](https://cloudinary.com/console) - Sign up and get cloud name, API key, and secret
- **PayHere**: [payhere.lk/merchant](https://www.payhere.lk/merchant/) - Create merchant account (optional)

#### Step 4: Setup Database

Run the migration script to create all tables:

```bash
python run_migration.py
```

#### Step 5: Create Admin User

```bash
python create_master_admin.py
```

Follow the prompts to create an admin account.

#### Step 6: Start Redis Server

In a **new terminal window**:

```bash
# On macOS (with Homebrew)
brew services start redis

# On Linux
sudo systemctl start redis

# Or run manually
redis-server
```

#### Step 7: Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**

API Documentation: **http://localhost:8000/docs**

---

### 3️⃣ Frontend Setup

Open a **new terminal window**.

#### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Cloudinary (for profile uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Application
NEXT_PUBLIC_APP_NAME=ExamBuddy
```

#### Step 4: Start Development Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:3000**

---

## 🎯 Quick Start Guide

### For Development:

1. **Start Redis** (in terminal 1):
   ```bash
   redis-server
   ```

2. **Start Backend** (in terminal 2):
   ```bash
   cd backend
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   uvicorn app.main:app --reload
   ```

3. **Start Frontend** (in terminal 3):
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Default Login

After creating an admin user, log in with your credentials at:
- **Admin**: http://localhost:3000/login

### First Time Setup

1. **Login as Admin**
2. **Go to Admin Dashboard** → Courses → Create your first course
3. **Add Exams** to the course
4. **Upload Questions** (bulk upload via CSV or individual)
5. **Register as a Student** (test the student flow)

---

## 📁 Project Structure

```
exambuddy/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   │   ├── auth.py        # Authentication
│   │   │   ├── student.py     # Student endpoints
│   │   │   ├── admin_content.py   # Admin content management
│   │   │   ├── admin_payment.py   # Payment management
│   │   │   └── payment.py     # Payment processing
│   │   ├── core/              # Security, cache, sessions
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database connection
│   │   └── main.py            # FastAPI app
│   ├── migrations/            # SQL migration files
│   ├── uploads/              # File uploads directory
│   ├── .env                  # Environment variables (not in git)
│   ├── .env.example          # Environment template
│   └── requirement.txt       # Python dependencies
│
├── frontend/                  # Next.js Frontend
│   ├── app/                  # Next.js app directory
│   │   ├── admin/           # Admin pages
│   │   ├── student/         # Student pages
│   │   ├── login/           # Login page
│   │   ├── register/        # Registration page
│   │   ├── payment/         # Payment pages
│   │   └── profile/         # User profile
│   ├── components/          # Reusable components
│   ├── lib/                 # Libraries and utilities
│   │   ├── api/            # API client functions
│   │   ├── redux/          # Redux store and slices
│   │   └── utils/          # Utility functions
│   ├── .env                # Environment variables (not in git)
│   ├── .env.example        # Environment template
│   └── package.json        # Node dependencies
│
└── README.md              # This file
```

---

## 🔧 Common Issues & Solutions

### Backend won't start

**Problem**: `ModuleNotFoundError: No module named 'psycopg2'`
- **Solution**: Make sure virtual environment is activated and dependencies installed:
  ```bash
  source venv/bin/activate
  pip install -r requirement.txt
  ```

**Problem**: `pydantic_core._pydantic_core.ValidationError: FRONTEND_URL`
- **Solution**: Make sure all required variables are set in `.env`:
  ```env
  FRONTEND_URL=http://localhost:3000
  BACKEND_URL=http://localhost:8000
  CORS_ORIGINS=http://localhost:3000
  ```

### Frontend won't connect to backend

**Problem**: `Network Error` or `CORS error`
- **Solution**: Ensure `NEXT_PUBLIC_API_URL` is set in frontend `.env`:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```

### Redis connection errors

**Problem**: `ConnectionRefusedError: [Errno 61] Connection refused`
- **Solution**: Make sure Redis server is running:
  ```bash
  redis-server
  ```

---

## 📚 Additional Documentation

- **[PAYMENT_SETUP.md](PAYMENT_SETUP.md)** - Payment integration guide
- **[PROJECT_PLAN.md](PROJECT_PLAN.md)** - Detailed project specifications
- **Backend API Docs**: http://localhost:8000/docs (when running)

---

## 🚢 Production Deployment

### Environment Variables for Production

**Backend:**
- Set `APP_ENV=production`
- Set `DEBUG=False`
- Use strong `SECRET_KEY` and `JWT_SECRET_KEY`
- Update `FRONTEND_URL` and `BACKEND_URL` to production URLs
- Use production database URL
- Set `PAYHERE_MODE=live` for real payments

**Frontend:**
- Update `NEXT_PUBLIC_API_URL` to production backend URL

### Build Commands

**Backend:**
```bash
pip install -r requirement.txt
python run_migration.py
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend:**
```bash
npm install
npm run build
npm start
```

---

## 👥 User Roles

### Student
- Register and create profile
- Browse available courses and exams
- Enroll in courses/exams (free or paid)
- Take timed exams
- View results and rankings
- Manage profile and payment

### Admin
- Manage students (view, activate, deactivate)
- Create and manage courses
- Create and manage exams
- Upload and manage questions
- Verify payments
- View analytics and reports
- Manage platform settings

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
