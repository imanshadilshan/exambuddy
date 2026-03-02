'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser } from '@/lib/redux/slices/authSlice'
import { fetchCourses, createCourse, updateCourse, deleteCourse, AdminCourse } from '@/lib/redux/slices/coursesSlice'
import { uploadImage, deleteImage } from '@/lib/api/admin'
import { getErrorMessage } from '@/lib/utils'

export default function AdminCoursesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)
  const { courses, isLoading: loadingData, error: storeError } = useAppSelector((state) => state.courses)

  const [localError, setLocalError] = useState('')
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null)
  const [removeCourseImage, setRemoveCourseImage] = useState(false)
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)

  const [courseForm, setCourseForm] = useState({
    title: '',
    subject: '',
    grade: 10,
    image_url: '',
    image_public_id: '',
    price: '',
    description: '',
  })

  const error = storeError || localError

  const uploadImageToCloudinary = async (file: File) => {
    const result = await uploadImage(file, 'courses')
    return { image_url: result.image_url, image_public_id: result.image_public_id }
  }

  const deleteImageFromCloudinary = async (publicId: string | null | undefined) => {
    if (!publicId) return
    try { await deleteImage(publicId) } catch (err) { console.error('Failed to delete image:', err) }
  }

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

    dispatch(fetchCourses())
  }, [isAuthenticated, user, dispatch, router])

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLocalError('')
      setIsCreatingCourse(true)

      // Validate title
      const title = courseForm.title ? courseForm.title.trim() : ''
      if (!title) {
        setLocalError('Please enter course title')
        setIsCreatingCourse(false)
        return
      }

      // Validate subject
      const subject = courseForm.subject ? courseForm.subject.trim() : ''
      if (!subject) {
        setLocalError('Please enter course subject')
        setIsCreatingCourse(false)
        return
      }

      if (!courseForm.price) {
        setLocalError('Please enter a price')
        setIsCreatingCourse(false)
        return
      }

      const price = Number(courseForm.price)
      if (isNaN(price) || price < 0) {
        setLocalError('Please enter a valid price')
        setIsCreatingCourse(false)
        return
      }

      // Safely prepare description
      const description = courseForm.description ? courseForm.description.trim() : null
      const finalDescription = description && description.length > 0 ? description : null

      let imageUrl: string | null = null
      let imagePublicId: string | null = null

      // Upload image if file was selected
      if (courseImageFile) {
        try {
          const uploadResult = await uploadImageToCloudinary(courseImageFile)
          imageUrl = uploadResult.image_url || null
          imagePublicId = uploadResult.image_public_id || null
        } catch (err: any) {
          setLocalError(getErrorMessage(err) || 'Failed to upload course image')
          setIsCreatingCourse(false)
          return
        }
      }

      await dispatch(createCourse({
        title: title,
        subject: subject,
        grade: courseForm.grade,
        image_url: imageUrl,
        image_public_id: imagePublicId,
        price: price,
        description: finalDescription,
      })).unwrap()

      setCourseForm({ title: '', subject: '', grade: 10, image_url: '', image_public_id: '', price: '', description: '' })
      setCourseImageFile(null)
      setShowCreateModal(false)
      setLocalError('')
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to create course')
    } finally {
      setIsCreatingCourse(false)
    }
  }

  const openCreateModal = () => {
    setLocalError('')
    setCourseForm({ title: '', subject: '', grade: 10, image_url: '', image_public_id: '', price: '', description: '' })
    setCourseImageFile(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setLocalError('')
    setCourseImageFile(null)
  }

  const openEditModal = (course: AdminCourse) => {
    setLocalError('')
    setCourseForm({
      title: course.title,
      subject: course.subject,
      grade: course.grade,
      image_url: course.image_url || '',
      image_public_id: course.image_public_id || '',
      price: String(course.price),
      description: course.description || '',
    })
    setCourseImageFile(null)
    setRemoveCourseImage(false)
    setEditingCourseId(course.id)
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setLocalError('')
    setCourseImageFile(null)
    setRemoveCourseImage(false)
    setEditingCourseId(null)
  }

  const handleEditCourse = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingCourseId) return

    try {
      setLocalError('')
      setIsCreatingCourse(true)

      // Validate title
      const title = courseForm.title ? courseForm.title.trim() : ''
      if (!title) {
        setLocalError('Please enter course title')
        setIsCreatingCourse(false)
        return
      }

      // Validate subject
      const subject = courseForm.subject ? courseForm.subject.trim() : ''
      if (!subject) {
        setLocalError('Please enter course subject')
        setIsCreatingCourse(false)
        return
      }

      if (!courseForm.price) {
        setLocalError('Please enter a price')
        setIsCreatingCourse(false)
        return
      }

      const price = Number(courseForm.price)
      if (isNaN(price) || price < 0) {
        setLocalError('Please enter a valid price')
        setIsCreatingCourse(false)
        return
      }

      // Safely prepare description
      const description = courseForm.description ? courseForm.description.trim() : null
      const finalDescription = description && description.length > 0 ? description : null

      let imageUrl: string | null = null
      let imagePublicId: string | null = null
      const oldPublicId = courseForm.image_public_id

      // Handle image removal
      if (removeCourseImage) {
        // Delete from Cloudinary
        if (oldPublicId) {
          await deleteImageFromCloudinary(oldPublicId)
        }
        imageUrl = null
        imagePublicId = null
      }
      // If editing and no new image selected, keep existing image
      else if (!courseImageFile && courseForm.image_url) {
        imageUrl = courseForm.image_url
        imagePublicId = courseForm.image_public_id
      }
      // Upload new image if file was selected
      else if (courseImageFile) {
        try {
          const uploadResult = await uploadImageToCloudinary(courseImageFile)
          imageUrl = uploadResult.image_url || null
          imagePublicId = uploadResult.image_public_id || null
          // Delete old image from Cloudinary if it exists
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId)
          }
        } catch (err: any) {
          setLocalError(getErrorMessage(err) || 'Failed to upload course image')
          setIsCreatingCourse(false)
          return
        }
      }

      await dispatch(updateCourse({
        id: editingCourseId,
        data: {
          title: title,
          subject: subject,
          grade: courseForm.grade,
          image_url: imageUrl,
          image_public_id: imagePublicId,
          price: price,
          description: finalDescription,
        }
      })).unwrap()

      closeEditModal()
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to update course')
    } finally {
      setIsCreatingCourse(false)
    }
  }

  const handleDeleteCourse = async (course: AdminCourse) => {
    const confirmed = window.confirm(`Delete course "${course.title}"? All exams inside this course will also be deleted.`)
    if (!confirmed) return

    try {
      setLocalError('')
      // Delete image from Cloudinary if it exists
      if (course.image_public_id) {
        await deleteImageFromCloudinary(course.image_public_id)
      }
      await dispatch(deleteCourse(course.id)).unwrap()
    } catch (err: any) {
      setLocalError(getErrorMessage(err) || 'Failed to delete course')
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
            <h1 className="text-xl font-bold text-gray-900">Course & Exam Management</h1>
            <p className="text-xs text-gray-500">Create grade-wise courses and exams</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && !showCreateModal && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Courses</h2>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
          >
            + Create Course
          </button>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {loadingData ? (
            <p className="text-sm text-gray-500">Loading data...</p>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No courses yet</p>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Create your first course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {course.image_url && (
                    <img
                      src={course.image_url}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{course.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Grade {course.grade} • {course.subject}
                      </p>
                    </div>
                    {course.description && (
                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{course.description}</p>
                    )}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-teal-700">LKR {course.price}</p>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href={`/admin/courses/${course.id}/exams`}
                        className="block w-full text-center px-3 py-2 text-xs rounded-md bg-teal-100 text-teal-700 hover:bg-teal-200 font-medium"
                      >
                        Manage Exams
                      </Link>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 px-2 py-2 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                          onClick={() => openEditModal(course)}
                        >
                          Edit
                        </button>
                        <button
                          className="flex-1 px-2 py-2 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => handleDeleteCourse(course)}
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

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create Course</h2>
              <button
                onClick={closeCreateModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Course Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  onChange={(e) => setCourseImageFile(e.target.files?.[0] || null)}
                />
                {courseImageFile && (
                  <p className="text-xs text-gray-600">Selected: {courseImageFile.name}</p>
                )}
              </div>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Course price (LKR)"
                value={courseForm.price}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, price: e.target.value }))}
                required
              />

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
                  disabled={isCreatingCourse}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {isCreatingCourse ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Course</h2>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditCourse} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Course Image</label>
                {courseForm.image_url && !courseImageFile && !removeCourseImage && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img src={courseForm.image_url} alt="Current course" className="w-24 h-16 rounded object-cover border border-gray-200" />
                        <span className="text-xs text-gray-600">Current image</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveCourseImage(true)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
                {removeCourseImage && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-700">Image will be removed when you save</p>
                      <button
                        type="button"
                        onClick={() => setRemoveCourseImage(false)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Undo
                      </button>
                    </div>
                  </div>
                )}
                {!removeCourseImage && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      onChange={(e) => setCourseImageFile(e.target.files?.[0] || null)}
                    />
                    {courseImageFile && (
                      <p className="text-xs text-gray-600">Selected: {courseImageFile.name} (will replace current image)</p>
                    )}
                  </>
                )}
              </div>
              <input
                type="number"
                min={0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Course price (LKR)"
                value={courseForm.price}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, price: e.target.value }))}
                required
              />

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
                  disabled={isCreatingCourse}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {isCreatingCourse ? 'Updating...' : 'Update Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
