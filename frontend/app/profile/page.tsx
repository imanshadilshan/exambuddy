'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser } from '@/lib/redux/slices/authSlice'
import { fetchMyEnrollments } from '@/lib/redux/slices/studentDashboardSlice'
import { getInitials } from '@/lib/utils/initials'
import apiClient from '@/lib/api/client'

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Mullaitivu', 'Vavuniya', 'Puttalam', 'Kurunegala', 'Anuradhapura',
  'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
  'Ampara', 'Trincomalee', 'Batticaloa',
]

export default function ProfilePage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)
  const { enrollments, loadingEnrollments } = useAppSelector((state) => state.studentDashboard)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    school: '',
    district: '',
    grade: 11,
  })

  // Sync form with user data when user loads
  useEffect(() => {
    if (user?.profile) {
      setForm({
        full_name: user.profile.full_name || '',
        phone_number: user.profile.phone_number || '',
        school: user.profile.school || '',
        district: user.profile.district || '',
        grade: user.profile.grade || 11,
      })
    }
  }, [user])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (!user) {
      dispatch(fetchCurrentUser())
    }
  }, [isAuthenticated, user, dispatch, router])

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyEnrollments())
    }
  }, [isAuthenticated, dispatch])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'grade' ? parseInt(value) : value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await apiClient.put('/api/v1/auth/profile', form)
      await dispatch(fetchCurrentUser())
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || 'Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current user values
    if (user?.profile) {
      setForm({
        full_name: user.profile.full_name || '',
        phone_number: user.profile.phone_number || '',
        school: user.profile.school || '',
        district: user.profile.district || '',
        grade: user.profile.grade || 11,
      })
    }
    setIsEditing(false)
    setSaveError('')
  }

  const handlePhotoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await apiClient.post('/api/v1/auth/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await dispatch(fetchCurrentUser())
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || 'Photo upload failed.')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (isLoading || loadingEnrollments) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const initials = getInitials(user?.profile?.full_name, user?.email)

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Profile Header */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 shadow-sm">
            <div className="flex items-start gap-6">
              <div className="relative">
                {user?.profile?.profile_photo_url ? (
                  <img
                    src={user.profile.profile_photo_url}
                    alt={user?.profile?.full_name || 'Profile'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-gray-200">
                    {initials}
                  </div>
                )}
                <button
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-colors border-2 border-white disabled:opacity-60"
                  title="Change profile photo"
                >
                  {uploadingPhoto ? (
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {user?.profile?.full_name || user?.email}
                </h2>
                <p className="text-gray-600 mb-4">{user?.email}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                    Grade {user?.profile?.grade}
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {user?.profile?.district}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Success / Error banners */}
          {saveSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile updated successfully!
            </div>
          )}
          {saveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {saveError}
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={isEditing ? form.full_name : (user?.profile?.full_name || '')}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors outline-none ${
                    isEditing
                      ? 'border-teal-400 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                      : 'border-gray-300 bg-gray-50 text-gray-700 cursor-default'
                  }`}
                />
              </div>

              {/* Email (always read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-default"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={isEditing ? form.phone_number : (user?.profile?.phone_number || '')}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors outline-none ${
                    isEditing
                      ? 'border-teal-400 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                      : 'border-gray-300 bg-gray-50 text-gray-700 cursor-default'
                  }`}
                />
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade</label>
                {isEditing ? (
                  <select
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-teal-400 rounded-lg bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option value={10}>Grade 10 (O/L)</option>
                    <option value={11}>Grade 11 (O/L)</option>
                    <option value={12}>Grade 12 (A/L)</option>
                    <option value={13}>Grade 13 (A/L)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user?.profile?.grade ? `Grade ${user.profile.grade}` : ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm cursor-default"
                  />
                )}
              </div>

              {/* School */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School</label>
                <input
                  type="text"
                  name="school"
                  value={isEditing ? form.school : (user?.profile?.school || '')}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors outline-none ${
                    isEditing
                      ? 'border-teal-400 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
                      : 'border-gray-300 bg-gray-50 text-gray-700 cursor-default'
                  }`}
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">District</label>
                {isEditing ? (
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-teal-400 rounded-lg bg-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option value="">Select district</option>
                    {DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user?.profile?.district || ''}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm cursor-default"
                  />
                )}
              </div>
            </div>

            {/* Edit mode action buttons */}
            {isEditing && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Enrollments */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">My Enrollments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Courses</p>
                <p className="text-2xl font-bold text-gray-900 mb-3">{enrollments.courses.length}</p>
                <div className="space-y-2">
                  {enrollments.courses.slice(0, 3).map((item) => (
                    <Link
                      key={item.enrollment_id}
                      href={`/student/courses/${item.course.id}`}
                      className="block text-sm text-blue-600 hover:text-blue-800"
                    >
                      {item.course.title}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Exams</p>
                <p className="text-2xl font-bold text-gray-900 mb-3">{enrollments.exams.length}</p>
                <div className="space-y-2">
                  {enrollments.exams.slice(0, 3).map((item) => (
                    <p key={item.enrollment_id} className="text-sm text-gray-700">
                      {item.exam.title}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
