"""
Create Master Admin User

Run this script to create the initial master admin user.
Usage: python create_master_admin.py
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.admin import Admin
from app.core.security import get_password_hash
import uuid


def create_master_admin(
    email: str = "admin@exambuddy.lk",
    password: str = "Admin@123",
    full_name: str = "Master Administrator"
):
    """
    Create master admin user
    
    Args:
        email: Admin email address
        password: Admin password
        full_name: Admin full name
    """
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"❌ User with email {email} already exists!")
            return False
        
        # Create user
        user = User(
            id=uuid.uuid4(),
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(user)
        db.flush()
        
        # Create admin profile
        admin = Admin(
            id=uuid.uuid4(),
            user_id=user.id,
            full_name=full_name,
            permissions={
                "manage_users": True,
                "manage_papers": True,
                "manage_payments": True,
                "view_analytics": True,
                "system_settings": True
            }
        )
        db.add(admin)
        
        db.commit()
        
        print("✅ Master admin created successfully!")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")
        print("\n⚠️  IMPORTANT: Please change the password after first login!")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating master admin: {e}")
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Creating Master Admin User...")
    print("=" * 50)
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # You can customize these values
    create_master_admin(
        email="admin@exambuddy.lk",
        password="Admin@123",
        full_name="Master Administrator"
    )
    
    print("=" * 50)
