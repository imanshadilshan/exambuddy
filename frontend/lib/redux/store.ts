import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import profileReducer from './slices/profileSlice'
import coursesReducer from './slices/coursesSlice'
import examsReducer from './slices/examsSlice'
import questionsReducer from './slices/questionsSlice'
import studentDashboardReducer from './slices/studentDashboardSlice'
import adminReducer from './slices/adminSlice'
import paymentReducer from './slices/paymentSlice'
import { errorHandlingMiddleware, loadingMiddleware } from './middleware'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    profile: profileReducer,
    courses: coursesReducer,
    exams: examsReducer,
    questions: questionsReducer,
    studentDashboard: studentDashboardReducer,
    admin: adminReducer,
    payment: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['ui/showNotification'],
      },
    }).concat(errorHandlingMiddleware, loadingMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
