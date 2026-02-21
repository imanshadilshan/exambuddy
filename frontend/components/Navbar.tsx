'use client'

import Link from 'next/link'
import { useAppSelector } from '@/lib/redux/hooks'
import ProfileDropdown from './ProfileDropdown'

export default function Navbar() {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-lg">
              🎓
            </div>
            <span className="text-xl font-bold text-gray-900">ExamBuddy</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
