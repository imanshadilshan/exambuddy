import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as studentApi from '@/lib/api/student'
import { MyEnrollmentsResponse, MyAttemptItem, ExamRankResponse, LeaderboardEntry, PlatformStats, RankingExam } from '@/lib/api/student'

interface DashboardState {
  enrollments: MyEnrollmentsResponse
  attempts: MyAttemptItem[]
  platformStats: PlatformStats | null
  rankingExams: RankingExam[]
  leaderboard: LeaderboardEntry[]
  examRank: ExamRankResponse | null
  
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
  rankingExams: [],
  leaderboard: [],
  examRank: null,

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
  async (params: { exam_id: string; limit?: number }, { rejectWithValue }) => {
    try {
      return await studentApi.getRankingsLeaderboard(params.exam_id, params.limit)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch leaderboard')
    }
  }
)

export const fetchRankingExams = createAsyncThunk(
  'dashboard/fetchRankingExams',
  async (_, { rejectWithValue }) => {
    try {
      return await studentApi.getRankingExams()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch ranking exams')
    }
  }
)

export const fetchExamRank = createAsyncThunk(
  'dashboard/fetchExamRank',
  async (examId: string, { rejectWithValue }) => {
    try {
      return await studentApi.getExamRanking(examId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch exam rank')
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
      // Ranking Exams
      .addCase(fetchRankingExams.pending, (state) => {
        state.loadingRankings = true
        state.error = null
      })
      .addCase(fetchRankingExams.fulfilled, (state, action: PayloadAction<RankingExam[]>) => {
        state.loadingRankings = false
        state.rankingExams = action.payload
      })
      .addCase(fetchRankingExams.rejected, (state, action) => {
        state.loadingRankings = false
        state.error = action.payload as string
      })
      // Exam Rank
      .addCase(fetchExamRank.pending, (state) => {
        state.loadingRankings = true
      })
      .addCase(fetchExamRank.fulfilled, (state, action: PayloadAction<ExamRankResponse>) => {
        state.loadingRankings = false
        state.examRank = action.payload
      })
      .addCase(fetchExamRank.rejected, (state, action) => {
        state.loadingRankings = false
        state.error = action.payload as string
      })
  }
})

export const { clearDashboardError } = dashboardSlice.actions
export default dashboardSlice.reducer
