/**
 * Student API - Course enrollment and exam access
 */

import apiClient from './client'

export interface Course {
  id: string
  title: string
  subject: string
  grade: number
  image_url: string | null
  description: string | null
  price: number
  is_active: boolean
}

export interface ExamWithAccess {
  id: string
  title: string
  description: string | null
  image_url: string | null
  duration_minutes: number
  total_questions: number
  price: number
  is_free: boolean
  is_enrolled: boolean
  enrollment_type: 'course' | 'exam' | null
}

export interface EnrollmentResponse {
  message: string
  enrollment_id?: string
  enrollment_type?: string
}

export interface EnrolledCourseItem {
  enrollment_id: string
  course: {
    id: string
    title: string
    subject: string
    grade: number
    image_url: string | null
    price: number
  }
  enrolled_at: string
}

export interface EnrolledExamItem {
  enrollment_id: string
  exam: {
    id: string
    title: string
    duration_minutes: number
    total_questions: number
    image_url: string | null
    price: number
  }
  enrolled_at: string
}

export interface MyEnrollmentsResponse {
  courses: EnrolledCourseItem[]
  exams: EnrolledExamItem[]
}

// Get all available courses
export const getAvailableCourses = async (): Promise<Course[]> => {
  const response = await apiClient.get('/api/v1/student/courses')
  return response.data
}

// Get course details
export const getCourseOverview = async (courseId: string): Promise<Course> => {
  const response = await apiClient.get(`/api/v1/student/courses/${courseId}`)
  return response.data
}

// Get course exams with enrollment status
export const getCourseExams = async (courseId: string): Promise<ExamWithAccess[]> => {
  const response = await apiClient.get(`/api/v1/student/courses/${courseId}/exams`)
  return response.data
}

// Enroll in free exam
export const enrollFreeExam = async (examId: string): Promise<EnrollmentResponse> => {
  const response = await apiClient.post(`/api/v1/student/exams/${examId}/enroll-free`)
  return response.data
}

// Get my enrollments
export const getMyEnrollments = async () => {
  const response = await apiClient.get('/api/v1/student/my-enrollments')
  return response.data as MyEnrollmentsResponse
}

// Check exam access
export const checkExamAccess = async (examId: string) => {
  const response = await apiClient.get(`/api/v1/student/check-access/${examId}`)
  return response.data
}
