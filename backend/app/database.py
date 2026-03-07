"""
Database Configuration and Session Management
"""
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings


logger = logging.getLogger(__name__)


def _is_postgres_url(database_url: str) -> bool:
    return database_url.startswith("postgresql")


def _build_connect_args(database_url: str) -> dict:
    """Return driver connect args, avoiding unsupported startup params for Neon pooler."""
    is_neon_pooler = ".neon.tech" in database_url and "-pooler." in database_url
    if is_neon_pooler:
        return {}

    if _is_postgres_url(database_url):
        return {"options": "-c statement_timeout=30000"}

    return {}

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    connect_args=_build_connect_args(settings.DATABASE_URL),
)


@event.listens_for(engine, "connect")
def set_statement_timeout(dbapi_connection, connection_record):
    """Apply a sane statement timeout for Neon pooler connections."""
    is_neon_pooler = ".neon.tech" in settings.DATABASE_URL and "-pooler." in settings.DATABASE_URL
    if not is_neon_pooler:
        return

    try:
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET statement_timeout TO 30000")
    except Exception as exc:
        logger.warning("Could not apply statement_timeout on Neon pooler connection: %s", exc)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


# Dependency to get database session
def get_db():
    """
    Database session dependency
    Yields a database session and ensures it's closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
