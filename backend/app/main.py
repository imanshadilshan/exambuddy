"""
ExamBuddy FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from app.config import settings
from app.api.v1 import api_router
from app.database import Base, engine
from app.core.cache import cache, close_redis
from app.core.rate_limit import limiter

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import uuid
import logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Starting ExamBuddy API...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Initialize Redis cache
    try:
        await cache.initialize()
        print("✅ Redis cache initialized")
    except Exception as e:
        print(f"⚠️  Redis initialization failed: {e}")
        print("   Application will continue without caching")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down ExamBuddy API...")
    await close_redis()
    print("✅ Redis connection closed")


# Swagger/Redoc visibility logic for Production
openapi_url = "/openapi.json" if settings.APP_ENV != "production" else None
docs_url = "/docs" if settings.APP_ENV != "production" else None
redoc_url = "/redoc" if settings.APP_ENV != "production" else None

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Educational platform for O/L and A/L students with MCQ papers and ranking system",
    debug=settings.DEBUG,
    lifespan=lifespan,
    openapi_url=openapi_url,
    docs_url=docs_url,
    redoc_url=redoc_url
)

# ── OWASP Sanitize 500 Errors
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    error_id = str(uuid.uuid4())
    logging.error(f"Internal Server Error [{error_id}]: {exc}")
    # Do not leak the traceback to the client
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error_id": error_id}
    )

# ── OWASP Ratelimiting Setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── OWASP Security Headers (Helmet alternative)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://res.cloudinary.com https://fonts.googleapis.com https://fonts.gstatic.com"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to ExamBuddy API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    redis_status = "healthy"
    try:
        await cache.initialize()
        redis_connected = await cache.client.ping() if cache.client else False
        if not redis_connected:
            redis_status = "disconnected"
    except Exception:
        redis_status = "unavailable"
    
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
