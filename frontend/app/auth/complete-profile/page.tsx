'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser, completeProfileThunk } from '@/lib/redux/slices/authSlice'

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Mullaitivu', 'Vavuniya', 'Puttalam', 'Kurunegala', 'Anuradhapura',
  'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
  'Ampara', 'Trincomalee', 'Batticaloa'
]

export default function CompleteProfilePage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { isAuthenticated, user } = useAppSelector((s) => s.auth)

  const [form, setForm] = useState({
    phone_number: '',
    school: '',
    district: '',
    grade: 11,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'grade' ? parseInt(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.phone_number || !form.school || !form.district) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await dispatch(completeProfileThunk(form)).unwrap()
      await dispatch(fetchCurrentUser())
      router.push('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const googlePicture = user?.profile?.profile_photo_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-lg w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center text-lg">🎓</div>
            <span className="text-lg font-bold text-gray-900">ExamBuddy</span>
          </Link>

          {/* Google profile picture */}
          {googlePicture ? (
            <img
              src={googlePicture}
              alt="Profile"
              className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-teal-100 object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-teal-100 flex items-center justify-center text-3xl">
              👤
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Almost there! 🎉</h1>
          <p className="text-gray-500 text-sm">
            We just need a few more details to complete your student profile.
            <br />This is a one-time step.
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              required
              placeholder="0771234567"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-colors"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Grade <span className="text-red-500">*</span>
            </label>
            <select
              name="grade"
              value={form.grade}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm bg-white transition-colors"
            >
              <option value={10}>Grade 10 (O/L)</option>
              <option value={11}>Grade 11 (O/L)</option>
              <option value={12}>Grade 12 (A/L)</option>
              <option value={13}>Grade 13 (A/L)</option>
            </select>
          </div>

          {/* School */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              School <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="school"
              value={form.school}
              onChange={handleChange}
              required
              placeholder="Your school name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm transition-colors"
            />
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              District <span className="text-red-500">*</span>
            </label>
            <select
              name="district"
              value={form.district}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none text-sm bg-white transition-colors"
            >
              <option value="">Select your district</option>
              {DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : 'Complete My Profile →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Your information is kept private and only used to personalise your learning experience.
        </p>
      </div>
    </div>
  )
}
