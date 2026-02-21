# ExamBuddy - State Management & Caching Setup

## Frontend: Redux State Management

### Overview
The frontend uses Redux Toolkit for comprehensive state management with the following features:

### Redux Store Structure

```
store/
├── auth          # Authentication & user state
├── ui            # UI state (notifications, loading, theme)
├── profile       # User profile management
├── papers        # MCQ papers & attempts
└── rankings      # Island-wide & district rankings
```

### Redux Slices

#### 1. **Auth Slice** (`authSlice.ts`)
- **State**: User, tokens, authentication status
- **Actions**:
  - `login()` - User login
  - `register()` - User registration
  - `fetchCurrentUser()` - Get current user data
  - `logout()` - Clear session
  - `setCredentials()` - Update tokens

#### 2. **UI Slice** (`uiSlice.ts`)
- **State**: Notifications, loading states, sidebar, theme
- **Actions**:
  - `showNotification()` - Display toast notification
  - `hideNotification()` - Hide specific notification
  - `setLoading()` - Global loading state
  - `toggleSidebar()` - Sidebar toggle
  - `setTheme()` - Theme switching

#### 3. **Profile Slice** (`profileSlice.ts`)
- **State**: User profile data, update status
- **Actions**:
  - `fetchProfile()` - Get user profile
  - `updateProfile()` - Update profile data
  - `clearProfile()` - Clear profile data

#### 4. **Papers Slice** (`papersSlice.ts`)
- **State**: Available papers, attempts, filters
- **Actions**:
  - `fetchPapers()` - Get filtered papers
  - `fetchPaperById()` - Get specific paper
  - `submitPaperAttempt()` - Submit answers
  - `fetchMyAttempts()` - Get user's attempts
  - `setFilters()` - Update filter criteria

#### 5. **Rankings Slice** (`rankingsSlice.ts`)
- **State**: Island-wide & district rankings, user rank
- **Actions**:
  - `fetchIslandWideRankings()` - Get national rankings
  - `fetchDistrictRankings()` - Get district rankings
  - `fetchMyRank()` - Get current user's rank

### Middleware

#### Error Handling Middleware
Automatically catches rejected actions and displays error notifications:
```typescript
// Automatically shows error notifications for failed API calls
// No need to manually handle errors in components
```

#### Loading Middleware
Manages global loading states for async operations.

### Usage in Components

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { login } from '@/lib/redux/slices/authSlice'
import { showNotification } from '@/lib/redux/slices/uiSlice'

function LoginComponent() {
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector(state => state.auth)
  
  const handleLogin = async (credentials) => {
    await dispatch(login(credentials))
    // Error handling and success notifications are automatic!
  }
  
  return (...)
}
```

### Notification System

The `NotificationManager` component automatically displays notifications:
- ✅ Success (green)
- ❌ Error (red)
- ⚠️ Warning (yellow)
- ℹ️ Info (blue)

Auto-dismiss after configurable duration.

---

## Backend: Redis Caching & Session Management

### Overview
The backend uses Redis for:
1. **Caching** - Frequently accessed data
2. **Session Management** - User sessions & JWT tokens
3. **Token Blacklisting** - Logout & security
4. **Active Users Tracking** - Online status

### Redis Utilities

#### 1. **Cache Utility** (`app/core/cache.py`)

**RedisCache Class:**
```python
from app.core.cache import cache

# Get from cache
value = await cache.get("key")

# Set with expiration (default 1 hour)
await cache.set("key", data, expire=3600)

# Delete key
await cache.delete("key")

# Check existence
exists = await cache.exists("key")

# Clear pattern
await cache.clear_pattern("user:*")
```

**Caching Decorator:**
```python
from app.core.cache import cached

@cached("user", expire=300)  # Cache for 5 minutes
async def get_user(user_id: str):
    return db.query(User).filter(User.id == user_id).first()
```

#### 2. **Session Manager** (`app/core/session.py`)

**SessionManager Class:**
```python
from app.core.session import session_manager

# Create session
session_id = await session_manager.create_session(
    user_id="123",
    session_data={"ip": "192.168.1.1"},
    expire_minutes=15
)

# Get session
session = await session_manager.get_session(session_id)

# Blacklist token (logout)
await session_manager.blacklist_token(token)

# Check if token is blacklisted
is_blacklisted = await session_manager.is_token_blacklisted(token)

# Mark user as active
await session_manager.set_user_active(user_id)

# Get active user count
count = await session_manager.get_active_users()
```

### Redis Configuration

**Environment Variables** (`.env`):
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Application Lifecycle

The FastAPI app automatically:
1. **Startup**: Initialize Redis connection
2. **Runtime**: Use caching & sessions
3. **Shutdown**: Close Redis connection gracefully

Check `/health` endpoint for Redis status.

---

## API Communication Flow

### Frontend → Backend

```
Component
   ↓
Redux Action (Thunk)
   ↓
API Client (Axios)
   ↓
Interceptor (Add JWT Token)
   ↓
Backend API Endpoint
   ↓
Redis Cache Check
   ↓
Database Query (if cache miss)
   ↓
Cache Result
   ↓
Return Response
   ↓
Redux State Update
   ↓
UI Re-render
```

### Error Handling Flow

```
API Error
   ↓
Axios Interceptor
   ↓
Redux Rejected Action
   ↓
Error Middleware
   ↓
Show Notification
   ↓
Update UI Error State
```

---

## Best Practices

### Frontend
1. **Always use Redux for API calls** - Never use fetch/axios directly in components
2. **Use typed hooks** - `useAppDispatch` and `useAppSelector`
3. **Handle loading states** - Use slice's `isLoading` property
4. **Leverage middleware** - Let middleware handle errors and notifications
5. **Keep components thin** - Move logic to Redux slices

### Backend
1. **Use caching decorator** - For expensive database queries
2. **Implement session management** - For secure user sessions
3. **Blacklist tokens on logout** - Enhance security
4. **Set appropriate TTL** - Balance performance vs freshness
5. **Handle Redis failures gracefully** - App should work without Redis

---

## Performance Optimizations

### Frontend
- **Code splitting**: Lazy load Redux slices
- **Memoization**: Use `createSelector` for derived state
- **Normalization**: Store data in normalized format

### Backend
- **Cache frequently accessed data**: User profiles, rankings
- **Use short TTLs for dynamic data**: Rankings (5 min)
- **Use long TTLs for static data**: Paper questions (1 hour)
- **Implement cache invalidation**: Clear cache on data updates

---

## Security Considerations

### Token Management
- Access tokens: 15 minutes expiration
- Refresh tokens: 7 days expiration
- Blacklist tokens on logout
- Store tokens in localStorage (consider httpOnly cookies for production)

### Redis Security
- Use password authentication in production
- Enable SSL/TLS for Redis connections
- Set appropriate key expiration times
- Never store sensitive data without encryption

---

## Development vs Production

### Development
- Redis: Local instance (localhost:6379)
- Notifications: Toast notifications for debugging
- Logging: Redux DevTools enabled

### Production
- Redis: Managed service (Redis Cloud, AWS ElastiCache)
- Notifications: Production-ready UI notifications
- Logging: Sentry or similar error tracking
- Token storage: httpOnly cookies

---

## Testing

### Frontend
```typescript
// Test Redux actions
import { store } from './store'
import { login } from './slices/authSlice'

test('login action', async () => {
  await store.dispatch(login({ email: '...', password: '...' }))
  expect(store.getState().auth.isAuthenticated).toBe(true)
})
```

### Backend
```python
# Test Redis caching
async def test_cache():
    await cache.set("test", "value")
    result = await cache.get("test")
    assert result == "value"
```

---

## Troubleshooting

### Frontend
- **Actions not updating state**: Check reducer implementation
- **Notifications not showing**: Verify NotificationManager is in layout
- **Token expired errors**: Implement token refresh logic

### Backend
- **Redis connection failed**: Check REDIS_HOST and REDIS_PORT
- **Cache not working**: Verify Redis is running
- **Session issues**: Check session TTL settings

---

## Future Enhancements

### Frontend
- [ ] Optimistic updates
- [ ] Offline support with Redux Persist
- [ ] Real-time updates with WebSockets
- [ ] Advanced caching strategies

### Backend
- [ ] Redis Cluster for high availability
- [ ] Cache warming strategies
- [ ] Advanced session management
- [ ] Rate limiting with Redis

---

## Resources

- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [Redis Documentation](https://redis.io/docs/)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
