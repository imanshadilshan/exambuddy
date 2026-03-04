import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as adminApi from '@/lib/api/admin'
import * as studentApi from '@/lib/api/student'
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
  scheduled_start?: string | null
}

interface ExamsState {
  // Admin stats
  exams: Exam[]
  isLoading: boolean
  error: string | null

  // Student stats
  currentAttempt: studentApi.StartExamResponse | null
  lastAttempt: any | null
  studentLoading: boolean
  studentError: string | null
}

const initialState: ExamsState = {
  exams: [],
  isLoading: false,
  error: null,
  
  currentAttempt: null,
  lastAttempt: null,
  studentLoading: false,
  studentError: null
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

export const startExam = createAsyncThunk(
  'exams/startExam',
  async (examId: string, { rejectWithValue }) => {
    try {
      const resp = await studentApi.startExam(examId)
      return resp
    } catch (error: any) {
      const detail = error?.response?.data?.detail
      // 409 = already attempted — pass the full detail object as rejection payload
      if (error?.response?.status === 409 && detail?.already_attempted) {
        return rejectWithValue({ alreadyAttempted: true, ...detail })
      }
      // 403 with not_started_yet = exam schedule hasn't opened yet
      if (error?.response?.status === 403 && detail?.not_started_yet) {
        return rejectWithValue({ notStartedYet: true, scheduledStart: detail.scheduled_start, message: detail.message })
      }
      return rejectWithValue(
        typeof detail === 'string' ? detail : 'Failed to start exam'
      )
    }
  }
)

export const submitExamAttempt = createAsyncThunk(
  'exams/submitExamAttempt',
  async ({ attemptId, payload }: { attemptId: string, payload: studentApi.SubmitExamRequest }, { rejectWithValue }) => {
    try {
      const resp = await studentApi.submitExamAttempt(attemptId, payload)
      return resp
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to submit exam attempt')
    }
  }
)

export const fetchLastAttempt = createAsyncThunk(
  'exams/fetchLastAttempt',
  async (examId: string, { rejectWithValue }) => {
    try {
      return await studentApi.getLastAttempt(examId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to fetch last attempt')
    }
  }
)

const examsSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    clearExamsError: (state) => {
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
      // Student Exams
      .addCase(startExam.pending, (state) => {
        state.studentLoading = true
        state.studentError = null
      })
      .addCase(startExam.fulfilled, (state, action: PayloadAction<studentApi.StartExamResponse>) => {
        state.studentLoading = false
        state.currentAttempt = action.payload
      })
      .addCase(startExam.rejected, (state, action) => {
        state.studentLoading = false
        // Important: payload can be the alreadyAttempted object (HTTP 409) — never put objects into error
        const p = action.payload
        state.studentError = typeof p === 'string' ? p : null
      })
      .addCase(submitExamAttempt.pending, (state) => {
        state.studentLoading = true
        state.studentError = null
      })
      .addCase(submitExamAttempt.fulfilled, (state) => {
        state.studentLoading = false
        // DO NOT clear currentAttempt here; the result page needs it for review mapping
      })
      .addCase(submitExamAttempt.rejected, (state, action) => {
        state.studentLoading = false
        state.studentError = action.payload as string
      })
      .addCase(fetchLastAttempt.pending, (state) => {
        state.studentLoading = true
        state.studentError = null
      })
      .addCase(fetchLastAttempt.fulfilled, (state, action) => {
        state.studentLoading = false
        state.lastAttempt = action.payload
      })
      .addCase(fetchLastAttempt.rejected, (state, action) => {
        state.studentLoading = false
        state.studentError = action.payload as string
      })
  },
})

export const { clearExamsError } = examsSlice.actions
export default examsSlice.reducer
