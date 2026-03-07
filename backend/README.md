# ExamBuddy Backend

FastAPI backend for the ExamBuddy educational platform.

## Prerequisites

- Python 3.11 or higher
- PostgreSQL (Neon DB)
- Redis / Upstash (for caching and background tasks)
- Cloudinary account (for file uploads)

## Setup Instructions

### 1. Create Virtual Environment

```bash
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Then edit `.env` and add your:
- **Neon DB connection string** (DATABASE_URL)
- **Upstash Redis URL** (REDIS_URL, rediss://...)
- **Cloudinary credentials** (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET)
- **PayHere credentials** (PAYHERE_MERCHANT_ID, MERCHANT_SECRET) - See [PAYHERE_INTEGRATION.md](PAYHERE_INTEGRATION.md)
- **JWT secret keys** (generate random strings)

### 4. Database Setup

Create database tables using Alembic migrations:

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 5. Run the Application

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### 6. Run Background Tasks (Optional)

In a separate terminal, start Celery worker:

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/                 # API routes
│   ├── services/            # Business logic
│   ├── core/                # Security, auth
│   ├── utils/               # Helpers
│   └── tasks/               # Background tasks
├── alembic/                 # Database migrations
├── tests/                   # Unit tests
├── .env                     # Environment variables (not in git)
├── .env.example             # Template
└── requirement.txt          # Dependencies
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Student registration
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh token

### Students
- `GET /api/v1/students/profile` - Get profile
- `GET /api/v1/students/papers` - Get available papers
- `POST /api/v1/attempts` - Start exam

### Admin
- `GET /api/v1/admin/students` - List students
- `POST /api/v1/admin/papers` - Create paper
- `POST /api/v1/admin/questions/bulk-upload` - Bulk upload questions

## Testing

```bash
pytest
```

## Development

```bash
# Format code
black .

# Lint
flake8 .
```

## Environment Variables

See `.env.example` for all available configuration options.

## Notes

- Ensure Redis is running before starting Celery workers
- Use strong secret keys in production
- Enable SSL for database connections in production
- **Payment Integration**: See [PAYHERE_INTEGRATION.md](PAYHERE_INTEGRATION.md) for detailed PayHere setup and implementation guide
- For bank slip uploads, ensure Cloudinary is properly configured
