import apiClient from './client'

// Papers API

export const fetchPapers = async (filters?: { subject?: string; grade?: number; difficulty?: string }) => {
  const params = new URLSearchParams()
  if (filters?.subject) params.append('subject', filters.subject)
  if (filters?.grade) params.append('grade', filters.grade.toString())
  if (filters?.difficulty) params.append('difficulty', filters.difficulty)
  
  const response = await apiClient.get(`/api/v1/papers?${params.toString()}`)
  return response.data
}

export const fetchPaperById = async (paperId: string) => {
  const response = await apiClient.get(`/api/v1/papers/${paperId}`)
  return response.data
}

export const submitPaper = async (paperId: string, answers: any) => {
  const response = await apiClient.post(`/api/v1/papers/${paperId}/submit`, { answers })
  return response.data
}

export const fetchMyAttempts = async () => {
  const response = await apiClient.get('/api/v1/papers/my-attempts')
  return response.data
}

// Rankings API

export const fetchIslandWideRankings = async (filters?: { grade?: number; limit?: number }) => {
  const params = new URLSearchParams()
  if (filters?.grade) params.append('grade', filters.grade.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  
  const response = await apiClient.get(`/api/v1/rankings/island-wide?${params.toString()}`)
  return response.data
}

export const fetchDistrictRankings = async (filters?: { district?: string; grade?: number; limit?: number }) => {
  const params = new URLSearchParams()
  if (filters?.district) params.append('district', filters.district)
  if (filters?.grade) params.append('grade', filters.grade.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  
  const response = await apiClient.get(`/api/v1/rankings/district?${params.toString()}`)
  return response.data
}

export const fetchMyRank = async () => {
  const response = await apiClient.get('/api/v1/rankings/my-rank')
  return response.data
}

// Profile API

export const fetchProfile = async () => {
  const response = await apiClient.get('/api/v1/profile')
  return response.data
}

export const updateProfile = async (data: any) => {
  const response = await apiClient.put('/api/v1/profile', data)
  return response.data
}
