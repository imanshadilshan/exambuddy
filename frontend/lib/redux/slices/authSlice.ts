import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { 
  login as apiLogin, 
  register as apiRegister, 
  getCurrentUser,
  updateProfile as apiUpdateProfile,
  updateProfilePhoto as apiUpdateProfilePhoto,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  setPassword as apiSetPassword,
  changePassword as apiChangePassword,
} from '@/lib/api/auth'
import { googleLogin as apiGoogleLogin, completeGoogleProfile as apiCompleteGoogleProfile } from '@/lib/api/googleAuth'

interface User {
  id: string
  email: string
  role: string
  is_active: boolean
  auth_provider?: string    // 'email' | 'google'
  has_password?: boolean    // true when password_hash is set
  profile?: any
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  needsProfileCompletion: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  needsProfileCompletion: false,
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; remember_me?: boolean }, { rejectWithValue }) => {
    try {
      const response = await apiLogin(credentials)
      // Store tokens based on remember_me preference
      if (typeof window !== 'undefined') {
        const storage = credentials.remember_me ? localStorage : sessionStorage
        const other = credentials.remember_me ? sessionStorage : localStorage
        storage.setItem('accessToken', response.access_token)
        storage.setItem('refreshToken', response.refresh_token)
        other.removeItem('accessToken')
        other.removeItem('refreshToken')
      }
      return response
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg).filter(Boolean).join(', ')
            : error?.message || 'Login failed'
      return rejectWithValue(message)
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: any, { rejectWithValue }) => {
    try {
      const response = await apiRegister(data)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Registration failed')
    }
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getCurrentUser()
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user')
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data: { current_password: string; new_password: string }, { rejectWithValue }) => {
    try {
      const response = await apiChangePassword(data)
      return response
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to change password')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (data: any, { rejectWithValue }) => {
    try {
      return await apiUpdateProfile(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update profile')
    }
  }
)

export const updateProfilePhoto = createAsyncThunk(
  'auth/updateProfilePhoto',
  async (data: FormData, { rejectWithValue }) => {
    try {
      return await apiUpdateProfilePhoto(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update profile photo')
    }
  }
)

export const googleLoginThunk = createAsyncThunk(
  'auth/googleLogin',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await apiGoogleLogin(idToken)
      return response
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : error?.message || 'Google login failed'
      return rejectWithValue(message)
    }
  }
)

export const completeProfileThunk = createAsyncThunk(
  'auth/completeGoogleProfile',
  async (profileData: any, { rejectWithValue }) => {
    try {
      const response = await apiCompleteGoogleProfile(profileData)
      return response
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : error?.message || 'Profile completion failed'
      return rejectWithValue(message)
    }
  }
)

export const forgotPasswordThunk = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      return await apiForgotPassword({ email })
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to send reset email')
    }
  }
)

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async (data: { token: string; new_password: string; confirm_password: string }, { rejectWithValue }) => {
    try {
      return await apiResetPassword(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to reset password')
    }
  }
)

export const setPasswordThunk = createAsyncThunk(
  'auth/setPassword',
  async (data: { new_password: string; confirm_password: string }, { rejectWithValue }) => {
    try {
      return await apiSetPassword(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to set password')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.needsProfileCompletion = false
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
      }
    },
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken)
        localStorage.setItem('refreshToken', action.payload.refreshToken)
      }
    },
    clearNeedsProfileCompletion: (state) => {
      state.needsProfileCompletion = false
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.accessToken = action.payload.access_token
        state.refreshToken = action.payload.refresh_token
        state.isAuthenticated = true
        // Token storage is handled inside the thunk (localStorage vs sessionStorage)
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch current user
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false
        state.isAuthenticated = false
      })
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Google Login
      .addCase(googleLoginThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.accessToken = action.payload.access_token
        state.refreshToken = action.payload.refresh_token
        state.isAuthenticated = true
        state.needsProfileCompletion = action.payload.needs_profile_completion
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.user) {
          state.user = { ...state.user, profile: { ...state.user.profile, ...action.payload } }
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update profile photo
      .addCase(updateProfilePhoto.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfilePhoto.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.user) {
          state.user = { ...state.user, profile: { ...state.user.profile, ...action.payload } }
        }
      })
      .addCase(updateProfilePhoto.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // completeProfileThunk cases
      .addCase(completeProfileThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(completeProfileThunk.fulfilled, (state) => {
        state.isLoading = false
        state.needsProfileCompletion = false
      })
      .addCase(completeProfileThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Forgot password
      .addCase(forgotPasswordThunk.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(forgotPasswordThunk.fulfilled, (state) => { state.isLoading = false })
      .addCase(forgotPasswordThunk.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      // Reset password
      .addCase(resetPasswordThunk.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(resetPasswordThunk.fulfilled, (state) => { state.isLoading = false })
      .addCase(resetPasswordThunk.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
      // Set password
      .addCase(setPasswordThunk.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(setPasswordThunk.fulfilled, (state) => { state.isLoading = false })
      .addCase(setPasswordThunk.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string })
  },
})

export const { logout, setCredentials, clearNeedsProfileCompletion } = authSlice.actions
export default authSlice.reducer
