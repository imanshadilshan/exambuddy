'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCourseOverview, fetchCourseExams, enrollFreeExamThunk } from '@/lib/redux/slices/coursesSlice'
import { ExamWithAccess } from '@/lib/api/student'

export default function CourseOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string
  const dispatch = useAppDispatch()

  const { currentCourse: course, currentCourseExams: exams, studentLoading: loading, studentError: error } = useAppSelector(state => state.courses)
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) {
      dispatch(fetchCourseOverview(courseId))
      dispatch(fetchCourseExams(courseId))
    }
  }, [dispatch, courseId])

  const handleEnrollFreeExam = async (examId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) {
        router.push('/login')
        return
      }

      setEnrolling(examId)
      await dispatch(enrollFreeExamThunk(examId)).unwrap()
      // Reload exams to update enrollment status
      dispatch(fetchCourseExams(courseId))
    } catch (err: any) {
      alert(err || 'Failed to enroll in exam')
    } finally {
      setEnrolling(null)
    }
  }

  const handlePurchaseExam = (exam: ExamWithAccess) => {
    router.push(`/payment?type=exam&id=${exam.id}&name=${encodeURIComponent(exam.title)}&amount=${exam.price}`)
  }

  const handlePurchaseCourse = () => {
    if (!course) return
    router.push(`/payment?type=course&id=${course.id}&name=${encodeURIComponent(course.title)}&amount=${course.price}`)
  }

  const handleStartExam = (examId: string) => {
    router.push(`/student/exams/${examId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading course...</p>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Course not found'}
        </div>
      </div>
    )
  }

  const freeExams = exams.filter((e) => e.is_free)
  const paidExams = exams.filter((e) => !e.is_free)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Course Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/student/courses')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Courses
          </button>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              {course.image_url && (
                <img
                  src={course.image_url}
                  alt={course.title}
                  className="w-full h-64 object-cover rounded-lg shadow-md"
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  {course.subject}
                </span>
                <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Grade {course.grade}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
              {course.description && (
                <p className="text-gray-600 mb-6">{course.description}</p>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Full Course Access</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {course.price === 0 ? (
                        <span className="text-green-600">FREE</span>
                      ) : (
                        <span>LKR {course.price}</span>
                      )}
                    </p>
                  </div>
                </div>

                {course.is_enrolled ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-green-100 text-green-800 rounded-lg font-bold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enrolled
                  </button>
                ) : (
                  <button
                    onClick={handlePurchaseCourse}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                  >
                    Enroll in Full Course
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content - Exams List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Course Content</h2>

        <div className="space-y-6">
          {exams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No exams yet</h3>
              <p className="text-gray-500">Exams for this course haven't been published yet.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {exams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row">
                  {exam.image_url && (
                    <div className="md:w-48 h-48 md:h-auto flex-shrink-0">
                      <img src={exam.image_url} alt={exam.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                        {exam.is_enrolled && (
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Enrolled
                          </span>
                        )}
                      </div>
                      
                      {exam.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{exam.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {exam.duration_minutes} mins
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {exam.total_questions} questions
                        </div>
                        
                        {exam.already_attempted && exam.last_score !== null && exam.last_total !== null && (
                          <div className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Score: {exam.last_score}/{exam.last_total}
                          </div>
                        )}
                        
                        {exam.scheduled_start && new Date(exam.scheduled_start) > new Date() && (
                          <div className="flex items-center gap-1 font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Starts: {new Date(exam.scheduled_start).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {exam.is_free ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          <span>LKR {exam.price}</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {exam.is_enrolled || course.is_enrolled ? (
                          <button
                            onClick={() => handleStartExam(exam.id)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                          >
                            {exam.already_attempted ? 'Retake Exam' : 'Start Exam'}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        ) : exam.is_free ? (
                          <button
                            onClick={() => handleEnrollFreeExam(exam.id)}
                            disabled={enrolling === exam.id}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                          >
                            {enrolling === exam.id ? 'Enrolling...' : 'Enroll for Free'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePurchaseExam(exam)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            Purchase Exam
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
