import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '@/lib/api/client'

interface Profile {
  id: string
  full_name: string
  phone_number: string
  school: string
  district: string
  grade: number
  has_paid: boolean
  payment_date?: string
  created_at: string
}

interface ProfileState {
  profile: Profile | null
  isLoading: boolean
  error: string | null
  isUpdating: boolean
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
  isUpdating: false,
}

// Async thunks
export const fetchProfile = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/v1/auth/profile')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch profile')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (data: Partial<Profile>, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/api/v1/auth/profile', data)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update profile')
    }
  }
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.profile = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.profile = action.payload
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isUpdating = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isUpdating = false
        state.profile = action.payload
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdating = false
        state.error = action.payload as string
      })
  },
})

export const { clearProfile } = profileSlice.actions
export default profileSlice.reducer
