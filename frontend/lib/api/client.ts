import axios from 'axios'

// API Base URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set. API requests may fail.')
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Check sessionStorage first (default/non-remember-me), then localStorage (remember-me)
      const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''
    const isAuthRequest = requestUrl.includes('/api/v1/auth/login') || requestUrl.includes('/api/v1/auth/register')

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true

      try {
        if (typeof window !== 'undefined') {
          const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken')
          if (refreshToken) {
            sessionStorage.removeItem('accessToken')
            sessionStorage.removeItem('refreshToken')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            window.location.href = '/login'
          }
        }
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
