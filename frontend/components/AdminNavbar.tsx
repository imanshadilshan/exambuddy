'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { logout } from '@/lib/redux/slices/authSlice'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/rankings', label: 'Rankings' },
]

export default function AdminNavbar() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const handleLogout = () => {
    dispatch(logout())
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-lg">🎓</div>
            <div className="hidden sm:block">
              <p className="text-base font-bold text-gray-900 leading-tight">ExamBuddy Admin</p>
              <p className="text-xs text-gray-500 leading-tight">Master Control Panel</p>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'text-teal-700 bg-teal-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/admin/settings" className={`p-2 rounded-lg transition-colors ${pathname === '/admin/settings' ? 'text-teal-700 bg-teal-50' : 'text-gray-500 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.profile?.full_name || 'Administrator'}</p>
              <p className="text-xs text-gray-500 leading-tight">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1 shadow-lg">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-teal-700 bg-teal-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link href="/admin/settings" className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Settings
          </Link>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{user?.profile?.full_name || 'Administrator'}</p>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}

