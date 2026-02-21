import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import profileReducer from './slices/profileSlice'
import papersReducer from './slices/papersSlice'
import rankingsReducer from './slices/rankingsSlice'
import { errorHandlingMiddleware, loadingMiddleware } from './middleware'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    profile: profileReducer,
    papers: papersReducer,
    rankings: rankingsReducer,
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
