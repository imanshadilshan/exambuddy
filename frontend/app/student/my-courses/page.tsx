'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchMyEnrollments } from '@/lib/redux/slices/studentDashboardSlice'

export default function MyCoursesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth)
  const { enrollments, loadingEnrollments } = useAppSelector((state) => state.studentDashboard)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    dispatch(fetchMyEnrollments())
  }, [dispatch, isAuthenticated])

  if (authLoading || loadingEnrollments) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your courses...</p>
        </div>
      </div>
    )
  }

  const { courses, exams } = enrollments

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-600 mt-1">Your purchased and enrolled courses</p>
          </div>
          <Link
            href="/student/courses"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-sm"
          >
            Browse All Courses
          </Link>
        </div>

        {courses.length === 0 && exams.length === 0 ? (
          /* Empty state */
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h2>
            <p className="text-gray-500 mb-6">Purchase a course to get access to all its exams</p>
            <Link
              href="/student/courses"
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Enrolled Courses */}
            {courses.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-teal-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </span>
                  Enrolled Courses
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{courses.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((item) => (
                    <Link
                      key={item.enrollment_id}
                      href={`/student/courses/${item.course.id}`}
                      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-teal-300 transition-all"
                    >
                      {item.course.image_url ? (
                        <img
                          src={item.course.image_url}
                          alt={item.course.title}
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                          <svg className="w-12 h-12 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                            Grade {item.course.grade}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            {item.course.subject}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-3 group-hover:text-teal-700 transition-colors line-clamp-2">
                          {item.course.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full font-medium">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Enrolled
                          </span>
                          <span className="text-xs text-teal-600 font-medium group-hover:underline">
                            Open Course →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Enrolled standalone exams */}
            {exams.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </span>
                  Enrolled Exams
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{exams.length}</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.map((item) => (
                    <Link
                      key={item.enrollment_id}
                      href={`/student/exams/${item.exam.id}`}
                      className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      {item.exam.image_url && (
                        <img
                          src={item.exam.image_url}
                          alt={item.exam.title}
                          className="w-full h-28 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                        {item.exam.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span>{item.exam.total_questions} questions</span>
                        <span>•</span>
                        <span>{item.exam.duration_minutes} min</span>
                      </div>
                    <div className="flex items-center justify-between">
                        {item.already_attempted ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 border border-gray-300 px-2 py-1 rounded-full font-medium">
                              ✓ Completed
                              {item.last_score !== null && item.last_total !== null && item.last_total > 0 && (
                                <span className="font-bold ml-1">{Math.round((item.last_score / item.last_total) * 100)}%</span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 font-medium group-hover:underline">
                              See Result →
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Enrolled
                            </span>
                            <span className="text-xs text-blue-600 font-medium group-hover:underline">
                              Start Exam →
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
