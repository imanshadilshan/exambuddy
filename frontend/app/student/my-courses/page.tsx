'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchMyAttempts, fetchMyEnrollments } from '@/lib/redux/slices/studentDashboardSlice'
import { CourseExamItem, EnrolledExamItem } from '@/lib/api/student'

export default function MyExamsPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth)
  const { attempts, enrollments, loadingAttempts, loadingEnrollments } = useAppSelector(
    (state) => state.studentDashboard
  )

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    // Fetch attempts and all enrollments
    dispatch(fetchMyAttempts(100))
    dispatch(fetchMyEnrollments())
  }, [dispatch, isAuthenticated])

  // Extract all unattempted exams from both standalone enrollments and course enrollments
  const availableExams = useMemo(() => {
    // Use a Map keyed by exam ID so course enrollments (which carry subject info) overwrite
    // standalone enrollments, preventing duplicates when the same exam exists in both.
    const examMap = new Map<string, {
      id: string
      title: string
      subject: string | null
      total_questions: number
      duration_minutes: number
      scheduled_start: string | null
      image_url: string | null
    }>()

    // 1. From standalone exams (add first; may be overwritten by course entry below)
    if (enrollments?.exams) {
      enrollments.exams.forEach((item: EnrolledExamItem) => {
        if (!item.already_attempted) {
          examMap.set(item.exam.id, {
            id: item.exam.id,
            title: item.exam.title,
            subject: null,
            total_questions: item.exam.total_questions,
            duration_minutes: item.exam.duration_minutes,
            scheduled_start: (item.exam as any).scheduled_start ?? null,
            image_url: item.exam.image_url,
          })
        }
      })
    }

    // 2. From course exams (overwrite standalone entry if same exam ID — course has richer info)
    if (enrollments?.courses) {
      enrollments.courses.forEach((courseItem) => {
        if (courseItem.exams) {
          courseItem.exams.forEach((examItem: CourseExamItem) => {
            if (!examItem.already_attempted) {
              examMap.set(examItem.id, {
                id: examItem.id,
                title: examItem.title,
                subject: courseItem.course.subject,
                total_questions: examItem.total_questions,
                duration_minutes: examItem.duration_minutes,
                scheduled_start: examItem.scheduled_start,
                image_url: examItem.image_url || courseItem.course.image_url,
              })
            }
          })
        }
      })
    }

    return Array.from(examMap.values())
  }, [enrollments])

  if (authLoading || loadingAttempts || loadingEnrollments) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your exams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
            <p className="text-gray-600 mt-1">Manage your pending exams and review past results</p>
          </div>
          <Link
            href="/student/courses"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-sm"
          >
            Browse New Exams
          </Link>
        </div>

        {attempts.length === 0 && availableExams.length === 0 ? (
          /* Empty state */
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No exams available</h2>
            <p className="text-gray-500 mb-6">Enroll in courses or standalone exams to see them here.</p>
            <Link
              href="/student/courses"
              className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              Browse Courses & Exams
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* 1. Pending / Available Exams */}
            {availableExams.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                  Available Exams
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{availableExams.length}</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableExams.map((exam) => {
                    const isScheduledFuture = exam.scheduled_start && new Date(exam.scheduled_start) > new Date()
                    
                    return (
                      <Link
                        key={exam.id}
                        href={`/student/exams/${exam.id}`}
                        className={`group bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col ${
                          isScheduledFuture ? 'border-orange-200 opacity-90' : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {exam.image_url && (
                          <div className="h-28 w-full overflow-hidden">
                            <img src={exam.image_url} alt={exam.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        )}
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className={`font-semibold text-lg mb-1 line-clamp-2 ${isScheduledFuture ? 'text-gray-700' : 'text-gray-900 group-hover:text-blue-700'}`}>
                            {exam.title}
                          </h3>
                          {exam.subject && (
                            <p className="text-sm font-medium text-gray-500 mb-2">{exam.subject}</p>
                          )}

                          {/* Always show scheduled date/time if set */}
                          {exam.scheduled_start && (
                            <p className={`text-xs flex items-center gap-1 mb-2 ${isScheduledFuture ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {isScheduledFuture ? 'Opens: ' : 'Date: '}
                              {new Date(exam.scheduled_start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-auto">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {exam.total_questions} Qs
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {exam.duration_minutes} min
                            </span>
                          </div>

                          {/* Status / Call to Action */}
                          {isScheduledFuture ? (
                            <div className="mt-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-orange-100">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Not open yet
                            </div>
                          ) : (
                            <div className="mt-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              Start Exam
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 2. Completed Exams */}
            {attempts.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  Completed Exams
                  <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{attempts.length}</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {attempts.map((attempt) => (
                    <div
                      key={attempt.attempt_id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-teal-300 transition-all flex flex-col"
                    >
                      <div className="p-5 flex-1 border-b border-gray-100">
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-md border border-green-200 uppercase tracking-wide flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Completed
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                          {attempt.exam_title}
                        </h3>
                        <p className="text-sm font-medium text-teal-600 mb-4">
                          {attempt.subject}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Score */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                            <div className="text-2xl font-bold text-gray-900">
                              {attempt.marks_obtained !== null && attempt.total_questions !== null && attempt.total_questions > 0
                                ? Math.round((attempt.marks_obtained / attempt.total_questions) * 100)
                                : 0}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                              Score
                            </div>
                          </div>

                          {/* Rank */}
                          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                            <div className="text-2xl font-bold text-gray-900 flex items-baseline justify-center gap-1">
                              <span className="text-sm text-gray-400 font-medium">#</span>
                              {attempt.district_rank || '-'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 uppercase font-semibold">
                              District Rank
                            </div>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/student/exams/${attempt.exam_id}`}
                        className="bg-gray-50 px-5 py-3.5 text-center text-sm font-semibold text-teal-700 hover:bg-teal-50 hover:text-teal-800 transition-colors flex items-center justify-center gap-2"
                      >
                        View Full Result & Explanations
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
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
