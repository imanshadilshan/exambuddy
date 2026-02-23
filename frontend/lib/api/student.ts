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

export interface ExamQuestionOptionView {
  id: string
  option_text: string | null
  option_image_url: string | null
  order_number: number
}

export interface ExamQuestionView {
  id: string
  question_text: string
  question_image_url: string | null
  explanation: string | null
  order_number: number
  options: ExamQuestionOptionView[]
}

export interface StartExamResponse {
  attempt_id: string
  exam_id: string
  exam_title: string
  subject: string
  duration_minutes: number
  started_at: string
  ends_at: string
  questions: ExamQuestionView[]
}

export interface SubmitExamRequest {
  answers: Array<{
    question_id: string
    selected_option_id: string | null
  }>
}

export interface SubmitExamResponse {
  attempt_id: string
  marks_obtained: number
  total_questions: number
  time_taken_seconds: number
  review: Array<{
    question_id: string
    question_text: string
    explanation: string | null
    selected_option_id: string | null
    correct_option_id: string
    is_correct: boolean
  }>
  ranking: {
    subject: string
    overall_rank: number | null
    district_rank: number | null
  }
}

export interface SubjectRankResponse {
  subject: string
  overall_rank: number | null
  district_rank: number | null
}

export interface MyAttemptItem {
  attempt_id: string
  exam_id: string
  exam_title: string
  subject: string
  marks_obtained: number | null
  total_questions: number | null
  time_taken_seconds: number | null
  status: string
  submitted_at: string | null
  overall_rank: number | null
  district_rank: number | null
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

export const startExam = async (examId: string): Promise<StartExamResponse> => {
  const response = await apiClient.post(`/api/v1/student/exams/${examId}/start`)
  return response.data
}

export const submitExamAttempt = async (
  attemptId: string,
  payload: SubmitExamRequest
): Promise<SubmitExamResponse> => {
  const response = await apiClient.post(`/api/v1/student/exam-attempts/${attemptId}/submit`, payload)
  return response.data
}

export const getSubjectRanking = async (subject: string): Promise<SubjectRankResponse> => {
  const response = await apiClient.get(`/api/v1/student/rankings/subject/${encodeURIComponent(subject)}`)
  return response.data
}

export const getMyAttempts = async (limit = 10): Promise<MyAttemptItem[]> => {
  const response = await apiClient.get('/api/v1/student/my-attempts', {
    params: { limit },
  })
  return response.data
}
