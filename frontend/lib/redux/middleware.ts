import { Middleware } from '@reduxjs/toolkit'
import { showNotification } from './slices/uiSlice'

/**
 * Redux middleware to handle errors globally and show notifications
 */
export const errorHandlingMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action)
  
  // Check if action is rejected (error)
  if (action.type && action.type.endsWith('/rejected')) {
    const errorMessage = action.payload as string || 'An error occurred'
    
    store.dispatch(showNotification({
      type: 'error',
      message: errorMessage,
      duration: 5000,
    }))
  }
  
  // Check if action is fulfilled (success)
  if (action.type && action.type.endsWith('/fulfilled')) {
    // Show success notifications for specific actions
    if (action.type.includes('login/fulfilled')) {
      store.dispatch(showNotification({
        type: 'success',
        message: 'Successfully logged in!',
        duration: 3000,
      }))
    } else if (action.type.includes('register/fulfilled')) {
      store.dispatch(showNotification({
        type: 'success',
        message: 'Account created successfully!',
        duration: 3000,
      }))
    } else if (action.type.includes('updateProfile/fulfilled')) {
      store.dispatch(showNotification({
        type: 'success',
        message: 'Profile updated successfully!',
        duration: 3000,
      }))
    } else if (action.type.includes('submitPaperAttempt/fulfilled')) {
      store.dispatch(showNotification({
        type: 'success',
        message: 'Paper submitted successfully!',
        duration: 3000,
      }))
    }
  }
  
  return result
}

/**
 * Redux middleware to handle loading states
 */
export const loadingMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Set loading to true for pending actions
  if (action.type && action.type.endsWith('/pending')) {
    // You can dispatch setLoading here if needed
  }
  
  // Set loading to false for fulfilled or rejected actions
  if (action.type && (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected'))) {
    // You can dispatch setLoading here if needed
  }
  
  return next(action)
}
