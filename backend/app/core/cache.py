"""
Redis Cache Utility
"""
import json
import redis.asyncio as redis
from typing import Optional, Any
from functools import wraps
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError

from app.config import settings

# Redis connection pool
redis_client: Optional[redis.Redis] = None
_redis_unavailable: bool = False

async def get_redis() -> Optional[redis.Redis]:
    """Get Redis client instance"""
    global redis_client, _redis_unavailable
    
    if _redis_unavailable:
        return None
        
    if redis_client is None:
        try:
            redis_url = settings.redis_connection_url

            redis_client = await redis.from_url(
                redis_url,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=1,
                socket_connect_timeout=1
            )
        except Exception as e:
            print(f"Warning: Failed to connect to Redis. Running without cache. Error: {e}")
            _redis_unavailable = True
            return None
    return redis_client


async def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


class RedisCache:
    """Redis cache manager"""
    
    def __init__(self):
        self.client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.client = await get_redis()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.client:
            await self.initialize()
            
        if not self.client:
            return None
        
        try:
            value = await self.client.get(key)
        except (RedisConnectionError, RedisTimeoutError, OSError, Exception) as e:
            print(f"Cache get error: {e}")
            self.client = None
            return None
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None
    
    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        """Set value in cache with expiration time in seconds"""
        if not self.client:
            await self.initialize()
            
        if not self.client:
            return False
        
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            await self.client.set(key, value, ex=expire)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.client:
            await self.initialize()
            
        if not self.client:
            return False
        
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.client:
            await self.initialize()
            
        if not self.client:
            return False
        
        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            print(f"Cache exists error: {e}")
            self.client = None
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.client:
            await self.initialize()
            
        if not self.client:
            return 0
        
        try:
            keys = await self.client.keys(pattern)
            if keys:
                return await self.client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache clear_pattern error: {e}")
            self.client = None
            return 0


# Global cache instance
cache = RedisCache()


def cached(key_prefix: str, expire: int = 3600):
    """
    Decorator to cache function results
    
    Usage:
        @cached("user", expire=300)
        async def get_user(user_id: str):
            return db.query(User).filter(User.id == user_id).first()
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function arguments
            cache_key = f"{key_prefix}:{':'.join(str(arg) for arg in args)}"
            
            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # If not in cache, call function
            result = await func(*args, **kwargs)
            
            # Store in cache
            if result is not None:
                await cache.set(cache_key, result, expire)
            
            return result
        return wrapper
    return decorator
