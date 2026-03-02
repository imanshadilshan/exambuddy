import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as adminApi from '@/lib/api/admin'

interface QuestionOption {
  id?: string
  option_text: string | null
  option_image_url: string | null
  option_image_public_id: string | null
  is_correct: boolean
  order_number: number
}

interface Question {
  id: string
  exam_id: string
  question_text: string
  question_image_url: string | null
  question_image_public_id: string | null
  explanation: string | null
  order_number: number
  options: QuestionOption[]
}

interface QuestionsState {
  questions: Question[]
  isLoading: boolean
  error: string | null
}

const initialState: QuestionsState = {
  questions: [],
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchQuestions = createAsyncThunk(
  'questions/fetchQuestions',
  async (examId: string, { rejectWithValue }) => {
    try {
      return await adminApi.getQuestions(examId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load questions')
    }
  }
)

export const createQuestion = createAsyncThunk(
  'questions/createQuestion',
  async (data: any, { rejectWithValue }) => {
    try {
      return await adminApi.createQuestion(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to create question')
    }
  }
)

export const updateQuestion = createAsyncThunk(
  'questions/updateQuestion',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      return await adminApi.updateQuestion(id, data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to update question')
    }
  }
)

export const deleteQuestion = createAsyncThunk(
  'questions/deleteQuestion',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminApi.deleteQuestion(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to delete question')
    }
  }
)

export const importQuestionsCSV = createAsyncThunk(
  'questions/importQuestionsCSV',
  async ({ examId, file }: { examId: string; file: File }, { rejectWithValue }) => {
    try {
      const result = await adminApi.importQuestionsCSV(examId, file)
      return result.questions || []
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to import questions from CSV')
    }
  }
)

const questionsSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearQuestions: (state) => {
      state.questions = []
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch questions
      .addCase(fetchQuestions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchQuestions.fulfilled, (state, action: PayloadAction<Question[]>) => {
        state.isLoading = false
        state.questions = action.payload
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create question
      .addCase(createQuestion.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createQuestion.fulfilled, (state, action: PayloadAction<Question>) => {
        state.isLoading = false
        state.questions.push(action.payload)
      })
      .addCase(createQuestion.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update question
      .addCase(updateQuestion.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateQuestion.fulfilled, (state, action: PayloadAction<Question>) => {
        state.isLoading = false
        const index = state.questions.findIndex(q => q.id === action.payload.id)
        if (index !== -1) {
          state.questions[index] = action.payload
        }
      })
      .addCase(updateQuestion.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete question
      .addCase(deleteQuestion.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteQuestion.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false
        state.questions = state.questions.filter(q => q.id !== action.payload)
      })
      .addCase(deleteQuestion.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Import CSV
      .addCase(importQuestionsCSV.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(importQuestionsCSV.fulfilled, (state, action: PayloadAction<Question[]>) => {
        state.isLoading = false
        // Append imported questions; the page will re-fetch to get the canonical list
        if (action.payload && action.payload.length > 0) {
          state.questions = [...state.questions, ...action.payload]
        }
      })
      .addCase(importQuestionsCSV.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError, clearQuestions } = questionsSlice.actions
export default questionsSlice.reducer
