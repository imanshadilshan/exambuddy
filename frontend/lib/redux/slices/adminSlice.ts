import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as adminApi from '@/lib/api/admin'
import type {
  AdminStats,
  AnalyticsData,
  AdminStudentsResponse,
  AdminStudent,
  AdminRankingsResponse,
} from '@/lib/api/admin'

// ── State ──────────────────────────────────────────────────────────────────

interface AdminState {
  // Dashboard stats
  stats: AdminStats | null
  statsLoading: boolean

  // Analytics
  analytics: AnalyticsData | null
  analyticsLoading: boolean

  // Students
  students: AdminStudent[]
  studentsTotal: number
  studentsLoading: boolean

  // Rankings
  rankings: AdminRankingsResponse | null
  rankingsLoading: boolean

  error: string | null
}

const initialState: AdminState = {
  stats: null,
  statsLoading: false,

  analytics: null,
  analyticsLoading: false,

  students: [],
  studentsTotal: 0,
  studentsLoading: false,

  rankings: null,
  rankingsLoading: false,

  error: null,
}

// ── Thunks ─────────────────────────────────────────────────────────────────

export const fetchAdminStats = createAsyncThunk(
  'admin/fetchAdminStats',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getAdminStats()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load stats')
    }
  }
)

export const fetchAdminAnalytics = createAsyncThunk(
  'admin/fetchAdminAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getAdminAnalytics()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load analytics')
    }
  }
)

export const fetchAdminStudents = createAsyncThunk(
  'admin/fetchAdminStudents',
  async (
    params: { search?: string; grade?: number; district?: string; is_active?: boolean; skip?: number; limit?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await adminApi.getAdminStudents(params)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load students')
    }
  }
)

export const toggleStudentActiveStatus = createAsyncThunk(
  'admin/toggleStudentActiveStatus',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await adminApi.toggleStudentActive(userId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to toggle student status')
    }
  }
)

export const fetchAdminRankings = createAsyncThunk(
  'admin/fetchAdminRankings',
  async (
    params: { exam_id?: string; district?: string; limit?: number } | undefined,
    { rejectWithValue }
  ) => {
    try {
      return await adminApi.getAdminRankings(params)
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail
      return rejectWithValue(msg || 'Failed to load rankings')
    }
  }
)

// ── Slice ──────────────────────────────────────────────────────────────────

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Stats
      .addCase(fetchAdminStats.pending, (state) => {
        state.statsLoading = true
        state.error = null
      })
      .addCase(fetchAdminStats.fulfilled, (state, action: PayloadAction<AdminStats>) => {
        state.statsLoading = false
        state.stats = action.payload
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.statsLoading = false
        state.error = action.payload as string
      })

      // Analytics
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.analyticsLoading = true
        state.error = null
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action: PayloadAction<AnalyticsData>) => {
        state.analyticsLoading = false
        state.analytics = action.payload
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false
        state.error = action.payload as string
      })

      // Students
      .addCase(fetchAdminStudents.pending, (state) => {
        state.studentsLoading = true
        state.error = null
      })
      .addCase(fetchAdminStudents.fulfilled, (state, action: PayloadAction<AdminStudentsResponse>) => {
        state.studentsLoading = false
        state.students = action.payload.students
        state.studentsTotal = action.payload.total
      })
      .addCase(fetchAdminStudents.rejected, (state, action) => {
        state.studentsLoading = false
        state.error = action.payload as string
      })

      // Toggle student active — update in-place in Redux state
      .addCase(toggleStudentActiveStatus.fulfilled, (state, action: PayloadAction<{ user_id: string; is_active: boolean }>) => {
        const student = state.students.find(s => s.user_id === action.payload.user_id)
        if (student) student.is_active = action.payload.is_active
      })
      .addCase(toggleStudentActiveStatus.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Rankings
      .addCase(fetchAdminRankings.pending, (state) => {
        state.rankingsLoading = true
        state.error = null
      })
      .addCase(fetchAdminRankings.fulfilled, (state, action: PayloadAction<AdminRankingsResponse>) => {
        state.rankingsLoading = false
        state.rankings = action.payload
      })
      .addCase(fetchAdminRankings.rejected, (state, action) => {
        state.rankingsLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearAdminError } = adminSlice.actions
export default adminSlice.reducer
