import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as studentApi from '@/lib/api/student'
import { MyEnrollmentsResponse, MyAttemptItem, SubjectRankResponse, LeaderboardEntry, PlatformStats } from '@/lib/api/student'

interface DashboardState {
  enrollments: MyEnrollmentsResponse
  attempts: MyAttemptItem[]
  platformStats: PlatformStats | null
  rankingSubjects: string[]
  leaderboard: LeaderboardEntry[]
  subjectRank: SubjectRankResponse | null
  
  // Loading states
  loadingEnrollments: boolean
  loadingAttempts: boolean
  loadingStats: boolean
  loadingRankings: boolean
  
  // Error states
  error: string | null
}

const initialState: DashboardState = {
  enrollments: { courses: [], exams: [] },
  attempts: [],
  platformStats: null,
  rankingSubjects: [],
  leaderboard: [],
  subjectRank: null,

  loadingEnrollments: false,
  loadingAttempts: false,
  loadingStats: false,
  loadingRankings: false,
  error: null,
}

export const fetchMyEnrollments = createAsyncThunk(
  'dashboard/fetchMyEnrollments',
  async (_, { rejectWithValue }) => {
    try {
      return await studentApi.getMyEnrollments()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch enrollments')
    }
  }
)

export const fetchMyAttempts = createAsyncThunk(
  'dashboard/fetchMyAttempts',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      return await studentApi.getMyAttempts(limit)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch attempts')
    }
  }
)

export const fetchPlatformStats = createAsyncThunk(
  'dashboard/fetchPlatformStats',
  async (_, { rejectWithValue }) => {
    try {
      return await studentApi.getPlatformStats()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch platform statistics')
    }
  }
)

export const fetchLeaderboard = createAsyncThunk(
  'dashboard/fetchLeaderboard',
  async (params: { subject: string; limit?: number }, { rejectWithValue }) => {
    try {
      return await studentApi.getRankingsLeaderboard(params.subject, params.limit)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch leaderboard')
    }
  }
)

export const fetchRankingSubjects = createAsyncThunk(
  'dashboard/fetchRankingSubjects',
  async (_, { rejectWithValue }) => {
    try {
      return await studentApi.getRankingSubjects()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch ranking subjects')
    }
  }
)

export const fetchSubjectRank = createAsyncThunk(
  'dashboard/fetchSubjectRank',
  async (subject: string, { rejectWithValue }) => {
    try {
      return await studentApi.getSubjectRanking(subject)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch subject rank')
    }
  }
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Enrollments
      .addCase(fetchMyEnrollments.pending, (state) => {
        state.loadingEnrollments = true
        state.error = null
      })
      .addCase(fetchMyEnrollments.fulfilled, (state, action: PayloadAction<MyEnrollmentsResponse>) => {
        state.loadingEnrollments = false
        state.enrollments = action.payload
      })
      .addCase(fetchMyEnrollments.rejected, (state, action) => {
        state.loadingEnrollments = false
        state.error = action.payload as string
      })
      // Attempts
      .addCase(fetchMyAttempts.pending, (state) => {
        state.loadingAttempts = true
        state.error = null
      })
      .addCase(fetchMyAttempts.fulfilled, (state, action: PayloadAction<MyAttemptItem[]>) => {
        state.loadingAttempts = false
        state.attempts = action.payload
      })
      .addCase(fetchMyAttempts.rejected, (state, action) => {
        state.loadingAttempts = false
        state.error = action.payload as string
      })
      // Platform Stats
      .addCase(fetchPlatformStats.pending, (state) => {
        state.loadingStats = true
        state.error = null
      })
      .addCase(fetchPlatformStats.fulfilled, (state, action: PayloadAction<PlatformStats>) => {
        state.loadingStats = false
        state.platformStats = action.payload
      })
      .addCase(fetchPlatformStats.rejected, (state, action) => {
        state.loadingStats = false
        state.error = action.payload as string
      })
      // Leaderboard
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loadingRankings = true
        state.error = null
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action: PayloadAction<LeaderboardEntry[]>) => {
        state.loadingRankings = false
        state.leaderboard = action.payload
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.loadingRankings = false
        state.error = action.payload as string
      })
      // Ranking Subjects
      .addCase(fetchRankingSubjects.pending, (state) => {
        state.loadingRankings = true
        state.error = null
      })
      .addCase(fetchRankingSubjects.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.loadingRankings = false
        state.rankingSubjects = action.payload
      })
      .addCase(fetchRankingSubjects.rejected, (state, action) => {
        state.loadingRankings = false
        state.error = action.payload as string
      })
      // Subject Rank
      .addCase(fetchSubjectRank.pending, (state) => {
        state.loadingRankings = true
      })
      .addCase(fetchSubjectRank.fulfilled, (state, action: PayloadAction<SubjectRankResponse>) => {
        state.loadingRankings = false
        state.subjectRank = action.payload
      })
      .addCase(fetchSubjectRank.rejected, (state, action) => {
        state.loadingRankings = false
        state.error = action.payload as string
      })
  }
})

export const { clearDashboardError } = dashboardSlice.actions
export default dashboardSlice.reducer
