import apiClient from './client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirm_password: string
  full_name: string
  phone_number: string
  school: string
  district: string
  grade: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export const login = async (credentials: LoginCredentials): Promise<TokenResponse> => {
  const response = await apiClient.post('/api/v1/auth/login', credentials)
  return response.data
}

export const register = async (data: RegisterData) => {
  const response = await apiClient.post('/api/v1/auth/register', data)
  return response.data
}

export const getCurrentUser = async () => {
  const response = await apiClient.get('/api/v1/auth/me')
  return response.data
}

export const logout = async () => {
  const response = await apiClient.post('/api/v1/auth/logout')
  return response.data
}

export const updateProfile = async (data: any) => {
  const response = await apiClient.put('/api/v1/auth/profile', data)
  return response.data
}

export const updateProfilePhoto = async (data: FormData) => {
  const response = await apiClient.post('/api/v1/auth/profile-photo', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
