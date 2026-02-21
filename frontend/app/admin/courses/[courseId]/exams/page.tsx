'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser } from '@/lib/redux/slices/authSlice'
import { fetchCourses } from '@/lib/redux/slices/coursesSlice'
import { fetchExams, createExam, updateExam, deleteExam } from '@/lib/redux/slices/examsSlice'
import { uploadImage, deleteImage } from '@/lib/api/admin'

type Course = {
  id: string
  title: string
  subject: string
  grade: number
  image_url: string
  image_public_id?: string
  price: number
  description?: string
}

type Exam = {
  id: string
  course_id: string
  title: string
  image_url: string | null
  image_public_id?: string | null
  description?: string | null
  duration_minutes: number
  total_questions: number
}

export default function CourseExamsPage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)
  const { courses } = useAppSelector((state) => state.courses)
  const { exams, isLoading: loadingData, error: storeError } = useAppSelector((state) => state.exams)

  const [localError, setLocalError] = useState('')
  const [examImageFile, setExamImageFile] = useState<File | null>(null)
  const [isCreatingExam, setIsCreatingExam] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingExamId, setEditingExamId] = useState<string | null>(null)

  const [examForm, setExamForm] = useState({
    title: '',
    image_url: '',
    image_public_id: '',
    description: '',
    duration_hours: '',
    duration_minutes: '',
    total_questions: '',
  })

  const error = storeError || localError
  const course = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId])

  const uploadImageToCloudinary = async (file: File) => {
    const result = await uploadImage(file, 'exams')
    return {
      image_url: result.image_url,
      image_public_id: result.image_public_id,
    }
  }

  const deleteImageFromCloudinary = async (publicId: string | null | undefined) => {
    if (!publicId) return
    try {
      await deleteImage(publicId)
    } catch (err: any) {
      console.error('Failed to delete image from Cloudinary:', err)
    }
  }

  const getErrorMessage = (err: any): string => {
    // Handle Pydantic validation errors (object with msg field)
    if (err?.response?.data?.detail && typeof err.response.data.detail === 'object') {
      if (err.response.data.detail.msg) {
        return err.response.data.detail.msg
      }
      // Handle validation errors that are arrays
      if (Array.isArray(err.response.data.detail)) {
        const messages = err.response.data.detail
          .map((e: any) => e.msg || JSON.stringify(e))
          .join('; ')
        return messages || 'Validation error occurred'
      }
      return 'An error occurred'
    }
    // Handle string error messages
    if (typeof err?.response?.data?.detail === 'string') {
      return err.response.data.detail
    }
    // Fallback
    return 'An error occurred'
  }

  const pageTitle = useMemo(() => {
    if (!course) return 'Manage Exams'
    return `Manage Exams • ${course.title}`
  }, [course])

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

    // Fetch courses if not already loaded
    if (courses.length === 0) {
      dispatch(fetchCourses())
    }
    
    // Fetch exams for this course
    dispatch(fetchExams(courseId))
  }, [isAuthenticated, user, dispatch, router, courseId, courses.length])

  const handleCreateExam = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLocalError('')
      setIsCreatingExam(true)

      // Validate title
      const title = examForm.title ? examForm.title.trim() : ''
      if (!title) {
        setLocalError('Please enter exam title')
        setIsCreatingExam(false)
        return
      }

      if (!examForm.duration_hours && !examForm.duration_minutes) {
        setLocalError('Please enter exam duration (hours and/or minutes)')
        setIsCreatingExam(false)
        return
      }

      if (!examForm.total_questions) {
        setLocalError('Please enter total questions')
        setIsCreatingExam(false)
        return
      }

      const hours = Number(examForm.duration_hours) || 0
      const minutes = Number(examForm.duration_minutes) || 0
      
      if (isNaN(hours) || isNaN(minutes)) {
        setLocalError('Please enter valid hours and minutes')
        setIsCreatingExam(false)
        return
      }

      const totalDurationMinutes = hours * 60 + minutes

      if (totalDurationMinutes < 1 || totalDurationMinutes > 480) {
        setLocalError('Duration must be between 1 minute and 8 hours')
        setIsCreatingExam(false)
        return
      }

      const totalQuestions = Number(examForm.total_questions)
      if (isNaN(totalQuestions) || totalQuestions < 0) {
        setLocalError('Please enter a valid number of questions')
        setIsCreatingExam(false)
        return
      }

      // Safely prepare description
      const description = examForm.description ? examForm.description.trim() : null
      const finalDescription = description && description.length > 0 ? description : null

      let imageUrl: string | null = null
      let imagePublicId: string | null = null

      // Upload image if file was selected
      if (examImageFile) {
        try {
          const uploadResult = await uploadImageToCloudinary(examImageFile)
          imageUrl = uploadResult.image_url || null
          imagePublicId = uploadResult.image_public_id || null
        } catch (err: any) {
          setLocalError(getErrorMessage(err) || 'Failed to upload exam image')
          setIsCreatingExam(false)
          return
        }
      }

      // Ensure courseId is valid
      if (!courseId) {
        setLocalError('Course ID is missing')
        setIsCreatingExam(false)
        return
      }

      await dispatch(createExam({
        course_id: String(courseId),
        title: title,
        image_url: imageUrl,
        image_public_id: imagePublicId,
        description: finalDescription,
        duration_minutes: totalDurationMinutes,
        total_questions: Math.floor(totalQuestions),
      })).unwrap()

      setExamForm({
        title: '',
        image_url: '',
        image_public_id: '',
        description: '',
        duration_hours: '',
        duration_minutes: '',
        total_questions: '',
      })
      setExamImageFile(null)
      setShowCreateModal(false)
      setLocalError('')
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to create exam')
    } finally {
      setIsCreatingExam(false)
    }
  }

  const openCreateModal = () => {
    setLocalError('')
    setExamForm({
      title: '',
      image_url: '',
      image_public_id: '',
      description: '',
      duration_hours: '',
      duration_minutes: '',
      total_questions: '',
    })
    setExamImageFile(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setLocalError('')
    setExamImageFile(null)
  }

  const openEditModal = (exam: Exam) => {
    setLocalError('')
    const hours = Math.floor(exam.duration_minutes / 60)
    const minutes = exam.duration_minutes % 60
    setExamForm({
      title: exam.title,
      image_url: exam.image_url || '',
      image_public_id: exam.image_public_id || '',
      description: exam.description || '',
      duration_hours: hours > 0 ? String(hours) : '',
      duration_minutes: minutes > 0 ? String(minutes) : '',
      total_questions: String(exam.total_questions),
    })
    setExamImageFile(null)
    setEditingExamId(exam.id)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setLocalError('')
    setExamImageFile(null)
    setEditingExamId(null)
  }

  const handleEditExam = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingExamId) return

    try {
      setLocalError('')
      setIsCreatingExam(true)

      // Validate title
      const title = examForm.title ? examForm.title.trim() : ''
      if (!title) {
        setLocalError('Please enter exam title')
        setIsCreatingExam(false)
        return
      }

      if (!examForm.duration_hours && !examForm.duration_minutes) {
        setLocalError('Please enter exam duration (hours and/or minutes)')
        setIsCreatingExam(false)
        return
      }

      if (!examForm.total_questions) {
        setLocalError('Please enter total questions')
        setIsCreatingExam(false)
        return
      }

      const hours = Number(examForm.duration_hours) || 0
      const minutes = Number(examForm.duration_minutes) || 0
      
      if (isNaN(hours) || isNaN(minutes)) {
        setLocalError('Please enter valid hours and minutes')
        setIsCreatingExam(false)
        return
      }

      const totalDurationMinutes = hours * 60 + minutes

      if (totalDurationMinutes < 1 || totalDurationMinutes > 480) {
        setLocalError('Duration must be between 1 minute and 8 hours')
        setIsCreatingExam(false)
        return
      }

      const totalQuestions = Number(examForm.total_questions)
      if (isNaN(totalQuestions) || totalQuestions < 0) {
        setLocalError('Please enter a valid number of questions')
        setIsCreatingExam(false)
        return
      }

      // Safely prepare description
      const description = examForm.description ? examForm.description.trim() : null
      const finalDescription = description && description.length > 0 ? description : null

      let imageUrl: string | null = null
      let imagePublicId: string | null = null
      const oldPublicId = examForm.image_public_id

      // If editing and no new image selected, keep existing image
      if (!examImageFile && examForm.image_url) {
        imageUrl = examForm.image_url
        imagePublicId = examForm.image_public_id
      }

      // Upload new image if file was selected
      if (examImageFile) {
        try {
          const uploadResult = await uploadImageToCloudinary(examImageFile)
          imageUrl = uploadResult.image_url || null
          imagePublicId = uploadResult.image_public_id || null
          // Delete old image from Cloudinary if it exists
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId)
          }
        } catch (err: any) {
          setLocalError(getErrorMessage(err) || 'Failed to upload exam image')
          setIsCreatingExam(false)
          return
        }
      }

      await dispatch(updateExam({
        id: editingExamId,
        data: {
          title: title,
          image_url: imageUrl,
          image_public_id: imagePublicId,
          description: finalDescription,
          duration_minutes: totalDurationMinutes,
          total_questions: Math.floor(totalQuestions),
        }
      })).unwrap()

      closeEditModal()
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to update exam')
    } finally {
      setIsCreatingExam(false)
    }
  }

  const handleDeleteExam = async (exam: Exam) => {
    const confirmed = window.confirm(`Delete exam "${exam.title}"?`)
    if (!confirmed) return

    try {
      setLocalError('')
      // Delete image from Cloudinary if it exists
      if (exam.image_public_id) {
        await deleteImageFromCloudinary(exam.image_public_id)
      }
      await dispatch(deleteExam(exam.id)).unwrap()
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to delete exam')
    }
  }

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
            <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
            {course && (
              <p className="text-xs text-gray-500">Grade {course.grade} • {course.subject} • LKR {course.price}</p>
            )}
          </div>
          <Link href="/admin/courses" className="px-4 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg">
            Back to Courses
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && !showCreateModal && !showEditModal && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Exams</h2>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium"
          >
            + Create Exam
          </button>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {loadingData ? (
            <p className="text-sm text-gray-500">Loading data...</p>
          ) : exams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No exams yet in this course</p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Create your first exam
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <div key={exam.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {exam.image_url && (
                    <img
                      src={exam.image_url}
                      alt={exam.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">{exam.title}</h3>
                    <div className="text-xs text-gray-600 mb-3 space-y-1">
                      <p>Duration: {exam.duration_minutes} minutes</p>
                      <p>Questions: {exam.total_questions}</p>
                    </div>
                    {exam.description && (
                      <p className="text-xs text-gray-600 mb-4 line-clamp-2">{exam.description}</p>
                    )}
                    <div className="space-y-2">
                      <Link 
                        href={`/admin/courses/${courseId}/exams/${exam.id}/questions`}
                        className="block w-full px-3 py-2 text-xs rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200 text-center font-medium"
                      >
                        Manage Questions
                      </Link>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 px-2 py-2 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={() => openEditModal(exam)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 px-2 py-2 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => handleDeleteExam(exam)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Exam</h2>
              <button
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Exam Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  onChange={(e) => setExamImageFile(e.target.files?.[0] || null)}
                />
                {examImageFile && (
                  <p className="text-xs text-gray-600">Selected: {examImageFile.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Hours"
                      value={examForm.duration_hours}
                      onChange={(e) => setExamForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Hours</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Minutes"
                      value={examForm.duration_minutes}
                      onChange={(e) => setExamForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minutes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Total Questions</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter total number of questions"
                  value={examForm.total_questions}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, total_questions: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExam}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50"
                >
                  {isCreatingExam ? 'Creating...' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Exam</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditExam} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Exam Image</label>
                {examForm.image_url && !examImageFile && (
                  <div className="flex items-center gap-3 mb-3">
                    <img src={examForm.image_url} alt="Current exam" className="w-24 h-16 rounded object-cover border border-gray-200" />
                    <span className="text-xs text-gray-600">Current image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  onChange={(e) => setExamImageFile(e.target.files?.[0] || null)}
                />
                {examImageFile && (
                  <p className="text-xs text-gray-600">Selected: {examImageFile.name} (will replace current image)</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={8}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Hours"
                      value={examForm.duration_hours}
                      onChange={(e) => setExamForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Hours</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Minutes"
                      value={examForm.duration_minutes}
                      onChange={(e) => setExamForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Minutes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Total Questions</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter total number of questions"
                  value={examForm.total_questions}
                  onChange={(e) => setExamForm((prev) => ({ ...prev, total_questions: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExam}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50"
                >
                  {isCreatingExam ? 'Updating...' : 'Update Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
