'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api/client'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser } from '@/lib/redux/slices/authSlice'

type Course = {
  id: string
  title: string
  subject: string
  grade: number
  image_url: string
  image_public_id?: string
  price: number
  description?: string
  is_active?: boolean
}

type Exam = {
  id: string
  course_id: string
  title: string
  image_url: string
  image_public_id?: string
  description?: string
  duration_minutes: number
  total_questions: number
  is_published?: boolean
}

export default function AdminCoursesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  const [courses, setCourses] = useState<Course[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  const [courseForm, setCourseForm] = useState({
    title: '',
    subject: '',
    grade: 10,
    image_url: '',
    image_public_id: '',
    price: 0,
    description: '',
  })

  const [examForm, setExamForm] = useState({
    course_id: '',
    title: '',
    image_url: '',
    image_public_id: '',
    description: '',
    duration_minutes: 60,
    total_questions: 0,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (!user) {
      dispatch(fetchCurrentUser())
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    void loadInitialData()
  }, [isAuthenticated, user, dispatch, router])

  const loadInitialData = async () => {
    try {
      setLoadingData(true)
      setError('')
      const [coursesRes, examsRes] = await Promise.all([
        apiClient.get('/api/v1/admin/courses'),
        apiClient.get('/api/v1/admin/exams'),
      ])
      setCourses(coursesRes.data)
      setExams(examsRes.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load admin data')
    } finally {
      setLoadingData(false)
    }
  }

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      await apiClient.post('/api/v1/admin/courses', {
        ...courseForm,
        title: courseForm.title.trim(),
        subject: courseForm.subject.trim(),
        image_url: courseForm.image_url.trim(),
        image_public_id: courseForm.image_public_id.trim() || null,
      })
      setCourseForm({ title: '', subject: '', grade: 10, image_url: '', image_public_id: '', price: 0, description: '' })
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create course')
    }
  }

  const handleCreateExam = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      await apiClient.post('/api/v1/admin/exams', {
        ...examForm,
        title: examForm.title.trim(),
        image_url: examForm.image_url.trim(),
        image_public_id: examForm.image_public_id.trim() || null,
      })
      setExamForm({ course_id: '', title: '', image_url: '', image_public_id: '', description: '', duration_minutes: 60, total_questions: 0 })
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create exam')
    }
  }

  const handleEditCourse = async (course: Course) => {
    const title = window.prompt('Course title', course.title)
    if (!title) return
    const subject = window.prompt('Subject', course.subject)
    if (!subject) return
    const gradeInput = window.prompt('Grade (10-13)', String(course.grade))
    if (!gradeInput) return
    const grade = Number(gradeInput)
    if (Number.isNaN(grade) || grade < 10 || grade > 13) {
      setError('Grade must be between 10 and 13')
      return
    }
    const description = window.prompt('Description (optional)', course.description || '')
    const imageUrl = window.prompt('Course image URL', course.image_url)
    if (!imageUrl) return
    const imagePublicId = window.prompt('Course image public_id (optional)', course.image_public_id || '')
    const priceInput = window.prompt('Course price (LKR)', String(course.price))
    if (!priceInput) return
    const price = Number(priceInput)
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be 0 or greater')
      return
    }

    try {
      setError('')
      await apiClient.put(`/api/v1/admin/courses/${course.id}`, {
        title: title.trim(),
        subject: subject.trim(),
        grade,
        image_url: imageUrl.trim(),
        image_public_id: (imagePublicId || '').trim() || null,
        price,
        description: description ?? '',
      })
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update course')
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    const confirmed = window.confirm(`Delete course "${course.title}"? All exams inside this course will also be deleted.`)
    if (!confirmed) return

    try {
      setError('')
      await apiClient.delete(`/api/v1/admin/courses/${course.id}`)
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete course')
    }
  }

  const handleEditExam = async (exam: Exam) => {
    const title = window.prompt('Exam title', exam.title)
    if (!title) return
    const durationInput = window.prompt('Duration in minutes', String(exam.duration_minutes))
    if (!durationInput) return
    const duration_minutes = Number(durationInput)
    if (Number.isNaN(duration_minutes) || duration_minutes < 5 || duration_minutes > 300) {
      setError('Duration must be between 5 and 300 minutes')
      return
    }
    const questionsInput = window.prompt('Total questions', String(exam.total_questions))
    if (!questionsInput) return
    const total_questions = Number(questionsInput)
    if (Number.isNaN(total_questions) || total_questions < 0) {
      setError('Total questions must be 0 or higher')
      return
    }
    const description = window.prompt('Description (optional)', exam.description || '')
    const imageUrl = window.prompt('Exam image URL', exam.image_url)
    if (!imageUrl) return
    const imagePublicId = window.prompt('Exam image public_id (optional)', exam.image_public_id || '')

    try {
      setError('')
      await apiClient.put(`/api/v1/admin/exams/${exam.id}`, {
        title: title.trim(),
        image_url: imageUrl.trim(),
        image_public_id: (imagePublicId || '').trim() || null,
        duration_minutes,
        total_questions,
        description: description ?? '',
      })
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update exam')
    }
  }

  const handleDeleteExam = async (exam: Exam) => {
    const confirmed = window.confirm(`Delete exam "${exam.title}"?`)
    if (!confirmed) return

    try {
      setError('')
      await apiClient.delete(`/api/v1/admin/exams/${exam.id}`)
      await loadInitialData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete exam')
    }
  }

  const filteredExams = selectedCourseId
    ? exams.filter((exam) => exam.course_id === selectedCourseId)
    : exams

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg font-semibold">Loading admin panel...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Course & Exam Management</h1>
            <p className="text-xs text-gray-500">Create grade-wise courses and exams</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreateCourse} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create Course</h2>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Course title"
              value={courseForm.title}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Subject (e.g., Mathematics)"
              value={courseForm.subject}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, subject: e.target.value }))}
              required
            />
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={courseForm.grade}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, grade: Number(e.target.value) }))}
            >
              {[10, 11, 12, 13].map((grade) => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Description (optional)"
              value={courseForm.description}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Course image URL"
              value={courseForm.image_url}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, image_url: e.target.value }))}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Course image public_id (optional)"
              value={courseForm.image_public_id}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, image_public_id: e.target.value }))}
            />
            <input
              type="number"
              min={0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Course price (LKR)"
              value={courseForm.price}
              onChange={(e) => setCourseForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
              required
            />
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700" type="submit">
              Create Course
            </button>
          </form>

          <form onSubmit={handleCreateExam} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create Exam in Course</h2>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={examForm.course_id}
              onChange={(e) => setExamForm((prev) => ({ ...prev, course_id: e.target.value }))}
              required
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  Grade {course.grade} • {course.subject} • {course.title}
                </option>
              ))}
            </select>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Exam title"
              value={examForm.title}
              onChange={(e) => setExamForm((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Description (optional)"
              value={examForm.description}
              onChange={(e) => setExamForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Exam image URL"
              value={examForm.image_url}
              onChange={(e) => setExamForm((prev) => ({ ...prev, image_url: e.target.value }))}
              required
            />
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Exam image public_id (optional)"
              value={examForm.image_public_id}
              onChange={(e) => setExamForm((prev) => ({ ...prev, image_public_id: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={5}
                max={300}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Duration (minutes)"
                value={examForm.duration_minutes}
                onChange={(e) => setExamForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
              />
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Total questions"
                value={examForm.total_questions}
                onChange={(e) => setExamForm((prev) => ({ ...prev, total_questions: Number(e.target.value) }))}
              />
            </div>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black" type="submit">
              Create Exam
            </button>
          </form>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Courses and Exams</h2>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          {loadingData ? (
            <p className="text-sm text-gray-500">Loading data...</p>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                if (selectedCourseId && selectedCourseId !== course.id) return null
                const courseExams = filteredExams.filter((exam) => exam.course_id === course.id)
                return (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-16 h-12 rounded object-cover border border-gray-200"
                        />
                        <h3 className="font-semibold text-gray-900">
                          Grade {course.grade} • {course.subject} • {course.title}
                          <span className="block text-sm text-teal-700 mt-1">LKR {course.price}</span>
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={() => handleEditCourse(course)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => handleDeleteCourse(course)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {course.description && <p className="text-sm text-gray-600 mt-1">{course.description}</p>}
                    <div className="mt-3 space-y-2">
                      {courseExams.length === 0 ? (
                        <p className="text-sm text-gray-500">No exams yet in this course.</p>
                      ) : (
                        courseExams.map((exam) => (
                          <div key={exam.id} className="bg-gray-50 rounded-md p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-start gap-3">
                                  <img
                                    src={exam.image_url}
                                    alt={exam.title}
                                    className="w-14 h-10 rounded object-cover border border-gray-200"
                                  />
                                  <div>
                                    <div className="font-medium text-gray-800">{exam.title}</div>
                                    <div className="text-gray-600">
                                      {exam.duration_minutes} min • {exam.total_questions} questions
                                    </div>
                                  </div>
                                </div>
                                {exam.description && <div className="text-gray-500 mt-1">{exam.description}</div>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="px-2 py-1 text-xs rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => handleEditExam(exam)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                                  onClick={() => handleDeleteExam(exam)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
