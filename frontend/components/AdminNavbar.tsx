'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/lib/redux/hooks'
import { useAppDispatch } from '@/lib/redux/hooks'
import { logout } from '@/lib/redux/slices/authSlice'

export default function AdminNavbar() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    dispatch(logout())
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-lg">
              🎓
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ExamBuddy Admin</h1>
              <p className="text-xs text-gray-500">Master Control Panel</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="px-3 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/courses"
              className="px-3 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Courses
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.profile?.full_name || 'Administrator'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
