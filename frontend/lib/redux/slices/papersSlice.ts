import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import apiClient from '@/lib/api/client'

interface Paper {
  id: string
  title: string
  subject: string
  grade: number
  difficulty: 'easy' | 'medium' | 'hard'
  total_questions: number
  duration: number
  created_at: string
}

interface PaperAttempt {
  id: string
  paper_id: string
  score: number
  total_questions: number
  time_taken: number
  completed_at: string
}

interface PapersState {
  papers: Paper[]
  currentPaper: Paper | null
  attempts: PaperAttempt[]
  isLoading: boolean
  error: string | null
  filters: {
    subject?: string
    grade?: number
    difficulty?: string
  }
}

const initialState: PapersState = {
  papers: [],
  currentPaper: null,
  attempts: [],
  isLoading: false,
  error: null,
  filters: {},
}

// Async thunks
export const fetchPapers = createAsyncThunk(
  'papers/fetchAll',
  async (filters: { subject?: string; grade?: number; difficulty?: string } | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.subject) params.append('subject', filters.subject)
      if (filters?.grade) params.append('grade', filters.grade.toString())
      if (filters?.difficulty) params.append('difficulty', filters.difficulty)
      
      const response = await apiClient.get(`/api/v1/papers?${params.toString()}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch papers')
    }
  }
)

export const fetchPaperById = createAsyncThunk(
  'papers/fetchById',
  async (paperId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/v1/papers/${paperId}`)
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch paper')
    }
  }
)

export const fetchMyAttempts = createAsyncThunk(
  'papers/fetchAttempts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/api/v1/papers/my-attempts')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch attempts')
    }
  }
)

export const submitPaperAttempt = createAsyncThunk(
  'papers/submitAttempt',
  async ({ paperId, answers }: { paperId: string; answers: any }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/api/v1/papers/${paperId}/submit`, { answers })
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to submit paper')
    }
  }
)

const papersSlice = createSlice({
  name: 'papers',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload
    },
    clearCurrentPaper: (state) => {
      state.currentPaper = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Papers
      .addCase(fetchPapers.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPapers.fulfilled, (state, action) => {
        state.isLoading = false
        state.papers = action.payload
      })
      .addCase(fetchPapers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch Paper by ID
      .addCase(fetchPaperById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPaperById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentPaper = action.payload
      })
      .addCase(fetchPaperById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch Attempts
      .addCase(fetchMyAttempts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchMyAttempts.fulfilled, (state, action) => {
        state.isLoading = false
        state.attempts = action.payload
      })
      .addCase(fetchMyAttempts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setFilters, clearCurrentPaper } = papersSlice.actions
export default papersSlice.reducer
