'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchCurrentUser, logout } from '@/lib/redux/slices/authSlice'

export default function DashboardPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    } else if (!user) {
      dispatch(fetchCurrentUser())
    }
  }, [isAuthenticated, user, dispatch, router])

  const handleLogout = () => {
    dispatch(logout())
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen animated-gradient animate-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-8 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-bold">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <header className="glass border-b border-gray-200/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              🎓
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">ExamBuddy</h1>
              <p className="text-sm text-gray-600">Student Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="glass border border-white/50 rounded-3xl p-8 mb-8 shadow-xl animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl">👋</div>
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Welcome back, {user?.profile?.full_name || user?.email}!
              </h2>
              <p className="text-gray-600 text-lg mt-1">
                {user?.profile?.has_paid 
                  ? "Your account is active. Ready to ace your exams!"
                  : "Complete payment to unlock all premium features."}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              <div className="text-sm text-gray-600 font-semibold mb-1">Email</div>
              <div className="text-lg font-bold text-gray-900 truncate">{user.email}</div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="text-sm text-gray-600 font-semibold mb-1">Grade</div>
              <div className="text-lg font-bold text-gray-900">Grade {user.profile?.grade} {user.profile?.grade && user.profile.grade >= 12 ? '(A/L)' : '(O/L)'}</div>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-sm text-gray-600 font-semibold mb-1">District</div>
              <div className="text-lg font-bold text-gray-900">{user.profile?.district}</div>
            </div>
          </div>
        )}

        {/* Payment Notice */}
        {user && !user.profile?.has_paid && (
          <div className="glass border border-white/50 rounded-3xl p-8 mb-8 border-l-4 border-yellow-500 bg-gradient-to-r from-yellow-50/80 to-orange-50/80 shadow-xl animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  ⚠️
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Account Activation Pending
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Complete your payment to unlock full access to 1000+ practice papers, live rankings, personalized analytics, and more premium features.
                </p>
                <button className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                  Complete Payment Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                📚
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Papers</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Browse and attempt MCQ papers</p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                🏆
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rankings</h3>
              <p className="text-sm text-gray-600 leading-relaxed">View your rank and compete</p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">My Results</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Check your exam results</p>
            </div>

            <div className="glass rounded-2xl p-6 border border-white/50 shadow-lg hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                ⚙️
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Settings</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Manage your account</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass border border-white/50 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-black text-gray-900 mb-6">Recent Activity</h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 text-lg">No recent activity yet</p>
            <p className="text-gray-500 mt-2">Start practicing to see your progress here</p>
          </div>
        </div>
      </main>
    </div>
  )
}
