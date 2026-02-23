import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as adminApi from '@/lib/api/admin'

export interface Course {
  id: string
  title: string
  subject: string
  grade: number
  image_url: string | null
  image_public_id?: string | null
  price: number
  description?: string | null
  is_active?: boolean
}

interface CoursesState {
  courses: Course[]
  isLoading: boolean
  error: string | null
}

const initialState: CoursesState = {
  courses: [],
  isLoading: false,
  error: null,
}

// Async thunks
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (_, { rejectWithValue }) => {
    try {
      return await adminApi.getCourses()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load courses')
    }
  }
)

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (data: any, { rejectWithValue }) => {
    try {
      return await adminApi.createCourse(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to create course')
    }
  }
)

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      return await adminApi.updateCourse(id, data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to update course')
    }
  }
)

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (id: string, { rejectWithValue }) => {
    try {
      await adminApi.deleteCourse(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to delete course')
    }
  }
)

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch courses
      .addCase(fetchCourses.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.isLoading = false
        state.courses = action.payload
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create course
      .addCase(createCourse.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createCourse.fulfilled, (state, action: PayloadAction<Course>) => {
        state.isLoading = false
        state.courses.unshift(action.payload)
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update course
      .addCase(updateCourse.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateCourse.fulfilled, (state, action: PayloadAction<Course>) => {
        state.isLoading = false
        const index = state.courses.findIndex(c => c.id === action.payload.id)
        if (index !== -1) {
          state.courses[index] = action.payload
        }
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete course
      .addCase(deleteCourse.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteCourse.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false
        state.courses = state.courses.filter(c => c.id !== action.payload)
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { clearError } = coursesSlice.actions
export default coursesSlice.reducer
