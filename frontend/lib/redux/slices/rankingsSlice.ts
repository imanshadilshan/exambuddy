import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '@/lib/api/client'

interface RankingUser {
  id: string
  name: string
  district: string
  grade: number
  total_score: number
  papers_completed: number
  rank: number
}

interface RankingsState {
  islandWide: RankingUser[]
  district: RankingUser[]
  myRank: {
    islandWide: number | null
    district: number | null
  }
  isLoading: boolean
  error: string | null
  selectedDistrict?: string
  selectedGrade?: number
}

const initialState: RankingsState = {
  islandWide: [],
  district: [],
  myRank: {
    islandWide: null,
    district: null,
  },
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchIslandWideRankings = createAsyncThunk(
  'rankings/fetchIslandWide',
  async (filters: { grade?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.grade) params.append('grade', filters.grade.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const response = await apiClient.get(`/api/v1/rankings/island-wide?${params.toString()}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch rankings')
    }
  }
)

export const fetchDistrictRankings = createAsyncThunk(
  'rankings/fetchDistrict',
  async (filters: { district?: string; grade?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.district) params.append('district', filters.district)
      if (filters?.grade) params.append('grade', filters.grade.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      
      const response = await apiClient.get(`/api/v1/rankings/district?${params.toString()}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch district rankings')
    }
  }
)

export const fetchMyRank = createAsyncThunk(
  'rankings/fetchMyRank',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/v1/rankings/my-rank')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch your rank')
    }
  }
)

const rankingsSlice = createSlice({
  name: 'rankings',
  initialState,
  reducers: {
    setSelectedDistrict: (state, action) => {
      state.selectedDistrict = action.payload
    },
    setSelectedGrade: (state, action) => {
      state.selectedGrade = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Island Wide Rankings
      .addCase(fetchIslandWideRankings.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchIslandWideRankings.fulfilled, (state, action) => {
        state.isLoading = false
        state.islandWide = action.payload
      })
      .addCase(fetchIslandWideRankings.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // District Rankings
      .addCase(fetchDistrictRankings.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchDistrictRankings.fulfilled, (state, action) => {
        state.isLoading = false
        state.district = action.payload
      })
      .addCase(fetchDistrictRankings.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // My Rank
      .addCase(fetchMyRank.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMyRank.fulfilled, (state, action) => {
        state.isLoading = false
        state.myRank = action.payload
      })
      .addCase(fetchMyRank.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setSelectedDistrict, setSelectedGrade } = rankingsSlice.actions
export default rankingsSlice.reducer
