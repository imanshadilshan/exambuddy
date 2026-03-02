import apiClient from './client'

interface GoogleLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  needs_profile_completion: boolean
}

export const googleLogin = async (idToken: string): Promise<GoogleLoginResponse> => {
  const response = await apiClient.post('/api/v1/auth/google', { id_token: idToken })
  const data = response.data as GoogleLoginResponse

  // Store tokens — same flow as regular login
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', data.access_token)
    localStorage.setItem('refreshToken', data.refresh_token)
  }

  return data
}

export const completeGoogleProfile = async (profileData: {
  phone_number: string
  school: string
  district: string
  grade: number
}): Promise<{ message: string }> => {
  const response = await apiClient.put('/api/v1/auth/complete-google-profile', profileData)
  return response.data
}
