import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as adminApi from '@/lib/api/admin'

interface Exam {
  id: string
  course_id: string
  title: string
  image_url: string | null
  image_public_id?: string | null
  description?: string | null
  duration_minutes: number
  total_questions: number
  price: number
}

interface ExamsState {
  exams: Exam[]
  isLoading: boolean
  error: string | null
}

const initialState: ExamsState = {
  exams: [],
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchExams = createAsyncThunk(
  'exams/fetchExams',
  async (courseId: string | undefined, { rejectWithValue }) => {
    try {
      return await adminApi.getExams(courseId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load exams')
    }
  }
)

export const createExam = createAsyncThunk(
  'exams/createExam',
  async (data: any, { rejectWithValue }) => {
    try {
      return await adminApi.createExam(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to create exam')
    }
  }
)

export const updateExam = createAsyncThunk(
  'exams/updateExam',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      return await adminApi.updateExam(id, data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to update exam')
    }
  }
)

export const deleteExam = createAsyncThunk(
  'exams/deleteExam',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminApi.deleteExam(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to delete exam')
    }
  }
)

const examsSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch exams
      .addCase(fetchExams.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchExams.fulfilled, (state, action: PayloadAction<Exam[]>) => {
        state.isLoading = false
        state.exams = action.payload
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create exam
      .addCase(createExam.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createExam.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false
        state.exams.unshift(action.payload)
      })
      .addCase(createExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update exam
      .addCase(updateExam.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateExam.fulfilled, (state, action: PayloadAction<Exam>) => {
        state.isLoading = false
        const index = state.exams.findIndex(e => e.id === action.payload.id)
        if (index !== -1) {
          state.exams[index] = action.payload
        }
      })
      .addCase(updateExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete exam
      .addCase(deleteExam.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteExam.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false
        state.exams = state.exams.filter(e => e.id !== action.payload)
      })
      .addCase(deleteExam.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = examsSlice.actions
export default examsSlice.reducer
