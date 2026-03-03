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
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Exams</h2>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => {
                const isScheduledFuture = exam.scheduled_start && new Date(exam.scheduled_start) > new Date()
                const isAccessible = exam.is_enrolled || course.is_enrolled

                return (
                  <div
                    key={exam.id}
                    className={`group bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col ${
                      isScheduledFuture ? 'border-orange-200 opacity-90' : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    {exam.image_url && (
                      <div className="h-36 w-full overflow-hidden">
                        <img
                          src={exam.image_url}
                          alt={exam.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col">
                      {/* Title + enrolled badge */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {exam.title}
                        </h3>
                        {exam.already_attempted && (
                          <span className="shrink-0 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-semibold uppercase tracking-wide">
                            Done
                          </span>
                        )}
                      </div>

                      {/* Score if attempted */}
                      {exam.already_attempted && exam.last_score !== null && exam.last_total !== null && (
                        <p className="text-xs text-blue-600 font-semibold mb-2">
                          Score: {exam.last_score}/{exam.last_total} ({Math.round((exam.last_score / exam.last_total) * 100)}%)
                        </p>
                      )}

                      {/* Scheduled date */}
                      {exam.scheduled_start && (
                        <p className={`text-xs flex items-center gap-1 mb-2 ${isScheduledFuture ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {isScheduledFuture ? 'Opens: ' : 'Date: '}
                          {new Date(exam.scheduled_start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      )}

                      {/* Meta: questions + duration */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto mb-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {exam.total_questions} Qs
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {exam.duration_minutes} min
                        </span>
                        {!isAccessible && (
                          <span className="ml-auto font-semibold text-gray-700">
                            {exam.is_free ? <span className="text-green-600">FREE</span> : `LKR ${exam.price}`}
                          </span>
                        )}
                      </div>

                      {/* CTA button */}
                      {isAccessible ? (
                        isScheduledFuture ? (
                          <div className="bg-orange-50 text-orange-700 border border-orange-100 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Not open yet
                          </div>
                        ) : exam.already_attempted ? (
                          <button
                            onClick={() => handleStartExam(exam.id)}
                            className="w-full bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-green-600 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            See Result
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartExam(exam.id)}
                            className="w-full bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                          >
                            Start Exam
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        )
                      ) : exam.is_free ? (
                        <button
                          onClick={() => handleEnrollFreeExam(exam.id)}
                          disabled={enrolling === exam.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {enrolling === exam.id ? 'Enrolling...' : 'Enroll for Free'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchaseExam(exam)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Enroll Now
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
