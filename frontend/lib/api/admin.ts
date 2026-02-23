import apiClient from './client'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminActivityItem {
  type: 'student' | 'payment' | 'exam'
  title: string
  subtitle: string
  timestamp: string | null
}

export interface AdminStats {
  total_students: number
  total_courses: number
  total_exams: number
  total_exam_attempts: number
  total_revenue: number
  revenue_this_month: number
  pending_bank_slips: number
  recent_activity: AdminActivityItem[]
}

// ── Stats ──────────────────────────────────────────────────────────────────

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await apiClient.get('/api/v1/admin/stats')
  return response.data
}

// Students Management

export interface AdminStudent {
  user_id: string
  email: string
  is_active: boolean
  joined_at: string | null
  full_name: string
  phone_number: string
  school: string
  district: string
  grade: number
  profile_photo_url: string | null
  enrollment_count: number
  attempt_count: number
}

export interface AdminStudentsResponse {
  total: number
  students: AdminStudent[]
}

export const getAdminStudents = async (params?: {
  search?: string
  grade?: number
  district?: string
  is_active?: boolean
  skip?: number
  limit?: number
}): Promise<AdminStudentsResponse> => {
  const response = await apiClient.get('/api/v1/admin/students', { params })
  return response.data
}

export const toggleStudentActive = async (userId: string): Promise<{ user_id: string; is_active: boolean }> => {
  const response = await apiClient.patch(`/api/v1/admin/students/${userId}/toggle-active`)
  return response.data
}

// Analytics

export interface AnalyticsData {
  revenue_by_month: { year: number; month: number; revenue: number; count: number }[]
  students_by_grade: { grade: number; count: number }[]
  students_by_district: { district: string; count: number }[]
  attempts_by_month: { year: number; month: number; count: number }[]
  top_exams: { exam_id: string; title: string; subject: string; grade: number; attempt_count: number; avg_score: number }[]
  enrollments_by_subject: { subject: string; count: number }[]
}

export const getAdminAnalytics = async (): Promise<AnalyticsData> => {
  const response = await apiClient.get('/api/v1/admin/analytics')
  return response.data
}

// Rankings

export interface AdminRankingRow {
  rank: number
  user_id: string
  full_name: string
  district: string
  grade: number
  school: string
  subject: string
  total_marks: number
  total_questions: number
  score_pct: number
  attempt_count: number
}

export interface AdminRankingsResponse {
  rankings: AdminRankingRow[]
  subjects: string[]
}

export const getAdminRankings = async (params?: {
  subject?: string
  grade?: number
  limit?: number
}): Promise<AdminRankingsResponse> => {
  const response = await apiClient.get('/api/v1/admin/rankings', { params })
  return response.data
}

// Course Management
export const getCourses = async () => {
  const response = await apiClient.get('/api/v1/admin/courses')
  return response.data
}

export const createCourse = async (data: any) => {
  const response = await apiClient.post('/api/v1/admin/courses', data)
  return response.data
}

export const updateCourse = async (id: string, data: any) => {
  const response = await apiClient.put(`/api/v1/admin/courses/${id}`, data)
  return response.data
}

export const deleteCourse = async (id: string) => {
  const response = await apiClient.delete(`/api/v1/admin/courses/${id}`)
  return response.data
}

// Exam Management
export const getExams = async (courseId?: string) => {
  const response = await apiClient.get('/api/v1/admin/exams', {
    params: courseId ? { course_id: courseId } : undefined
  })
  return response.data
}

export const createExam = async (data: any) => {
  const response = await apiClient.post('/api/v1/admin/exams', data)
  return response.data
}

export const updateExam = async (id: string, data: any) => {
  const response = await apiClient.put(`/api/v1/admin/exams/${id}`, data)
  return response.data
}

export const deleteExam = async (id: string) => {
  const response = await apiClient.delete(`/api/v1/admin/exams/${id}`)
  return response.data
}

// Image Management
export const uploadImage = async (file: File, entity: string) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity', entity)
  
  const response = await apiClient.post('/api/v1/admin/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const deleteImage = async (publicId: string) => {
  const response = await apiClient.post('/api/v1/admin/delete-image', { public_id: publicId })
  return response.data
}

// Question Management
export const getQuestions = async (examId: string) => {
  const response = await apiClient.get('/api/v1/admin/questions', {
    params: { exam_id: examId }
  })
  return response.data
}

export const getQuestion = async (id: string) => {
  const response = await apiClient.get(`/api/v1/admin/questions/${id}`)
  return response.data
}

export const createQuestion = async (data: any) => {
  const response = await apiClient.post('/api/v1/admin/questions', data)
  return response.data
}

export const updateQuestion = async (id: string, data: any) => {
  const response = await apiClient.put(`/api/v1/admin/questions/${id}`, data)
  return response.data
}

export const deleteQuestion = async (id: string) => {
  const response = await apiClient.delete(`/api/v1/admin/questions/${id}`)
  return response.data
}

export const importQuestionsCSV = async (examId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await apiClient.post(`/api/v1/admin/questions/import-csv/${examId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}
