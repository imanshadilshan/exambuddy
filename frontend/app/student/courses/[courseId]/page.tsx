'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as studentApi from '@/lib/api/student'

export default function CourseOverviewPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<studentApi.Course | null>(null)
  const [exams, setExams] = useState<studentApi.ExamWithAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) {
      loadCourseData()
    }
  }, [courseId])

  const loadCourseData = async () => {
    try {
      setLoading(true)
      const [courseData, examsData] = await Promise.all([
        studentApi.getCourseOverview(courseId),
        studentApi.getCourseExams(courseId),
      ])
      setCourse(courseData)
      setExams(examsData)
    } catch (err: any) {
      setError(err.message || 'Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollFreeExam = async (examId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) {
        router.push('/login')
        return
      }

      setEnrolling(examId)
      setError('')
      await studentApi.enrollFreeExam(examId)
      // Reload exams to update enrollment status
      const examsData = await studentApi.getCourseExams(courseId)
      setExams(examsData)
    } catch (err: any) {
      setError(err.message || 'Failed to enroll in exam')
    } finally {
      setEnrolling(null)
    }
  }

  const handlePurchaseExam = (exam: studentApi.ExamWithAccess) => {
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
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                  Grade {course.grade}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                  {course.subject}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {course.title}
              </h1>
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
                  {course.is_enrolled ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-800 border border-green-300 rounded-lg font-medium text-sm">
                        ✓ Already Enrolled
                      </span>
                      <span className="text-xs text-gray-500">You have full access to this course</span>
                    </div>
                  ) : course.price > 0 ? (
                    <button
                      onClick={handlePurchaseCourse}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Purchase Full Course
                    </button>
                  ) : null}
                </div>
                <p className="text-sm text-gray-500">
                  {course.is_enrolled
                    ? `You have access to all ${exams.length} exams in this course`
                    : `Get access to all ${exams.length} exams in this course`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exams Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Free Exams */}
        {freeExams.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Free Exams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onEnroll={handleEnrollFreeExam}
                  onPurchase={handlePurchaseExam}
                  onStart={handleStartExam}
                  enrolling={enrolling === exam.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Paid Exams */}
        {paidExams.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Paid Exams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paidExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onEnroll={handleEnrollFreeExam}
                  onPurchase={handlePurchaseExam}
                  onStart={handleStartExam}
                  enrolling={enrolling === exam.id}
                />
              ))}
            </div>
          </section>
        )}

        {exams.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No exams available for this course yet</p>
          </div>
        )}
      </main>
    </div>
  )
}

interface ExamCardProps {
  exam: studentApi.ExamWithAccess
  onEnroll: (examId: string) => void
  onPurchase: (exam: studentApi.ExamWithAccess) => void
  onStart: (examId: string) => void
  enrolling: boolean
}

function ExamCard({ exam, onEnroll, onPurchase, onStart, enrolling }: ExamCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {exam.image_url && (
        <img
          src={exam.image_url}
          alt={exam.title}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{exam.title}</h3>
        {exam.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {exam.description}
          </p>
        )}
        <div className="text-xs text-gray-600 mb-3 space-y-1">
          <p>Duration: {exam.duration_minutes} minutes</p>
          <p>Questions: {exam.total_questions}</p>
          <p className="flex items-center gap-2">
            Price:
            {exam.is_free ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                FREE
              </span>
            ) : (
              <span className="font-medium text-gray-900">LKR {exam.price}</span>
            )}
          </p>
        </div>

        {exam.is_enrolled ? (
          <div>
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-2">
              ✓ Enrolled {exam.enrollment_type === 'course' ? '(via course)' : ''}
            </div>
            <button
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              onClick={() => onStart(exam.id)}
            >
              Start Exam
            </button>
          </div>
        ) : exam.is_free ? (
          <button
            onClick={() => onEnroll(exam.id)}
            disabled={enrolling}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {enrolling ? 'Enrolling...' : 'Enroll Free'}
          </button>
        ) : (
          <button
            onClick={() => onPurchase(exam)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Purchase Exam
          </button>
        )}
      </div>
    </div>
  )
}
