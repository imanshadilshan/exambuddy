# State Management Quick Reference

## Frontend Usage Examples

### 1. Authentication

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { login, logout } from '@/lib/redux/slices/authSlice'

function MyComponent() {
  const dispatch = useAppDispatch()
  const { user, isLoading, error } = useAppSelector(state => state.auth)
  
  // Login
  const handleLogin = async () => {
    await dispatch(login({ email: '...', password: '...' }))
    // Auto-notification on success/error!
  }
  
  // Logout
  const handleLogout = () => {
    dispatch(logout())
  }
}
```

### 2. Show Notifications

```typescript
import { showNotification } from '@/lib/redux/slices/uiSlice'

// Success
dispatch(showNotification({
  type: 'success',
  message: 'Action completed!',
  duration: 3000
}))

// Error
dispatch(showNotification({
  type: 'error',
  message: 'Something went wrong!',
  duration: 5000
}))
```

### 3. Fetch Papers

```typescript
import { fetchPapers, setFilters } from '@/lib/redux/slices/papersSlice'

function PapersPage() {
  const dispatch = useAppDispatch()
  const { papers, isLoading } = useAppSelector(state => state.papers)
  
  useEffect(() => {
    dispatch(fetchPapers({ grade: 10, subject: 'Mathematics' }))
  }, [])
  
  // Update filters
  dispatch(setFilters({ difficulty: 'hard' }))
}
```

### 4. Rankings

```typescript
import { fetchIslandWideRankings, fetchMyRank } from '@/lib/redux/slices/rankingsSlice'

function RankingsPage() {
  const dispatch = useAppDispatch()
  const { islandWide, myRank } = useAppSelector(state => state.rankings)
  
  useEffect(() => {
    dispatch(fetchIslandWideRankings({ grade: 12, limit: 100 }))
    dispatch(fetchMyRank())
  }, [])
}
```

### 5. Profile Management

```typescript
import { fetchProfile, updateProfile } from '@/lib/redux/slices/profileSlice'

function ProfilePage() {
  const dispatch = useAppDispatch()
  const { profile, isUpdating } = useAppSelector(state => state.profile)
  
  useEffect(() => {
    dispatch(fetchProfile())
  }, [])
  
  const handleUpdate = async (data) => {
    await dispatch(updateProfile(data))
    // Auto-notification on success!
  }
}
```

## Backend Usage Examples

### 1. Redis Caching

```python
from app.core.cache import cache, cached

# Manual caching
async def get_rankings():
    # Try cache first
    cached_rankings = await cache.get("rankings:island")
    if cached_rankings:
        return cached_rankings
    
    # Fetch from DB
    rankings = fetch_from_database()
    
    # Cache for 5 minutes
    await cache.set("rankings:island", rankings, expire=300)
    return rankings

# Using decorator
@cached("user_profile", expire=300)
async def get_user_profile(user_id: str):
    return db.query(User).filter(User.id == user_id).first()
```

### 2. Session Management

```python
from app.core.session import session_manager

# In login endpoint
@router.post("/login")
async def login(credentials: LoginCredentials):
    # ... authentication logic ...
    
    # Create session
    await session_manager.create_session(
        user_id=str(user.id),
        session_data={"ip": request.client.host}
    )
    
    # Mark user as active
    await session_manager.set_user_active(str(user.id))
    
    return {"access_token": token}

# In logout endpoint
@router.post("/logout")
async def logout(current_user: User):
    # Delete all sessions
    await session_manager.delete_user_sessions(str(current_user.id))
    
    # Clear cache
    await cache.delete(f"user_profile:{current_user.id}")
```

### 3. Token Blacklisting

```python
# On logout
await session_manager.blacklist_token(access_token)

# Check in middleware
if await session_manager.is_token_blacklisted(token):
    raise HTTPException(status_code=401, detail="Token has been revoked")
```

### 4. Active Users Tracking

```python
# Get active user count
active_count = await session_manager.get_active_users()

# Check if user is online
is_online = await session_manager.is_user_active(user_id)
```

## Redis Key Patterns

```
session:{user_id}:{timestamp}           # User sessions
blacklist:{token}                       # Blacklisted tokens
user_active:{user_id}                   # Active users
user_profile:{user_id}                  # Cached user profiles
rankings:island                         # Island-wide rankings
rankings:district:{district}            # District rankings
papers:{subject}:{grade}                # Cached papers
```

## Environment Variables

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

DATABASE_URL=postgresql://...
JWT_SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Installation

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
pip install -r requirement.txt

# Install Redis (macOS)
brew install redis
brew services start redis

# Install Redis (Ubuntu)
sudo apt-get install redis-server
sudo systemctl start redis
```

## Running the Application

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm run dev
```

## Health Check

```bash
# Check backend + Redis
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "app": "ExamBuddy",
  "environment": "development",
  "redis": "healthy"
}
```

## Common Patterns

### Loading States

```typescript
// Component shows loading automatically
const { isLoading } = useAppSelector(state => state.papers)

{isLoading ? <Spinner /> : <PapersList papers={papers} />}
```

### Error Handling

```typescript
// Errors are automatically shown as notifications
// No manual error handling needed!
await dispatch(fetchPapers())
// If error occurs, red notification appears automatically
```

### Cache Invalidation

```python
# After updating ranking
await cache.delete("rankings:island")
await cache.clear_pattern("rankings:district:*")

# After updating user profile
await cache.delete(f"user_profile:{user_id}")
```

## Best Practices Checklist

### Frontend ✅
- [ ] Always use Redux for API calls (no direct axios calls)
- [ ] Use typed hooks (`useAppDispatch`, `useAppSelector`)
- [ ] Let middleware handle errors and notifications
- [ ] Check `isLoading` state before rendering
- [ ] Clear sensitive data on logout

### Backend ✅
- [ ] Use `@cached` decorator for expensive queries
- [ ] Set appropriate TTL for cached data
- [ ] Handle Redis failures gracefully (try/except)
- [ ] Invalidate cache when data changes
- [ ] Use session management for user tracking
- [ ] Blacklist tokens on logout

## Performance Tips

1. **Cache rankings for 5 minutes** (frequently viewed, updates slower)
2. **Cache user profiles for 5 minutes** (moderate update frequency)
3. **Cache papers for 1 hour** (static content)
4. **Don't cache real-time data** (current attempt progress)
5. **Use Redis patterns for bulk deletion** (`clear_pattern`)

## Security Reminders

⚠️ **Important:**
- Never cache sensitive data without encryption
- Always validate user input before caching
- Set expiration times on all cached data
- Use token blacklisting for logout
- Implement rate limiting with Redis
- Use HTTPS in production
- Consider httpOnly cookies for tokens in production
