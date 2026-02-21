# Redis Session Management Module
"""
Session management using Redis for user sessions and JWT token storage
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import json
from app.core.cache import cache
from app.config import settings


class SessionManager:
    """Manage user sessions with Redis"""
    
    SESSION_PREFIX = "session"
    TOKEN_BLACKLIST_PREFIX = "blacklist"
    USER_ACTIVE_PREFIX = "user_active"
    
    @staticmethod
    async def create_session(user_id: str, session_data: Dict[str, Any], expire_minutes: int = None) -> str:
        """Create a new user session"""
        if expire_minutes is None:
            expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        
        session_id = f"{SessionManager.SESSION_PREFIX}:{user_id}:{datetime.utcnow().timestamp()}"
        session_data['created_at'] = datetime.utcnow().isoformat()
        session_data['user_id'] = user_id
        
        await cache.set(session_id, session_data, expire=expire_minutes * 60)
        return session_id
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        return await cache.get(session_id)
    
    @staticmethod
    async def delete_session(session_id: str) -> bool:
        """Delete a session"""
        return await cache.delete(session_id)
    
    @staticmethod
    async def blacklist_token(token: str, expire_seconds: int = None) -> bool:
        """Add token to blacklist"""
        if expire_seconds is None:
            expire_seconds = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        
        key = f"{SessionManager.TOKEN_BLACKLIST_PREFIX}:{token}"
        return await cache.set(key, "1", expire=expire_seconds)
    
    @staticmethod
    async def is_token_blacklisted(token: str) -> bool:
        """Check if token is blacklisted"""
        key = f"{SessionManager.TOKEN_BLACKLIST_PREFIX}:{token}"
        return await cache.exists(key)
    
    @staticmethod
    async def set_user_active(user_id: str, expire_seconds: int = 300) -> bool:
        """Mark user as active (for online status)"""
        key = f"{SessionManager.USER_ACTIVE_PREFIX}:{user_id}"
        data = {
            'user_id': user_id,
            'last_seen': datetime.utcnow().isoformat()
        }
        return await cache.set(key, data, expire=expire_seconds)
    
    @staticmethod
    async def is_user_active(user_id: str) -> bool:
        """Check if user is currently active"""
        key = f"{SessionManager.USER_ACTIVE_PREFIX}:{user_id}"
        return await cache.exists(key)
    
    @staticmethod
    async def get_active_users() -> int:
        """Get count of active users"""
        if not cache.client:
            await cache.initialize()
        
        keys = await cache.client.keys(f"{SessionManager.USER_ACTIVE_PREFIX}:*")
        return len(keys) if keys else 0
    
    @staticmethod
    async def delete_user_sessions(user_id: str) -> int:
        """Delete all sessions for a user"""
        pattern = f"{SessionManager.SESSION_PREFIX}:{user_id}:*"
        return await cache.clear_pattern(pattern)


# Initialize session manager
session_manager = SessionManager()
