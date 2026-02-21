import apiClient from './client'

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
