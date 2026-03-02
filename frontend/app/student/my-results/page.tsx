'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchMyAttempts } from '@/lib/redux/slices/studentDashboardSlice'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function scoreColor(pct: number) {
  if (pct >= 75) return 'text-green-700 bg-green-50 border-green-200'
  if (pct >= 50) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export default function MyResultsPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth)
  const { attempts, loadingAttempts } = useAppSelector((state) => state.studentDashboard)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    if (attempts.length === 0) {
      dispatch(fetchMyAttempts(50))
    }
  }, [dispatch, isAuthenticated, attempts.length])

  const totalAttempts = attempts.length
  const bestPct = totalAttempts
    ? Math.max(...attempts.map((a) =>
        a.total_questions ? Math.round(((a.marks_obtained ?? 0) / a.total_questions) * 100) : 0
      ))
    : 0

  if (authLoading || loadingAttempts) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
            <p className="text-gray-500 mt-1">Your exam attempt history and scores</p>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            ← Dashboard
          </Link>
        </div>

        {/* Summary Stats */}
        {totalAttempts > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Attempts</p>
              <p className="text-3xl font-bold text-gray-900">{totalAttempts}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Best Score</p>
              <p className={`text-3xl font-bold ${bestPct >= 75 ? 'text-green-600' : bestPct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {bestPct}%
              </p>
            </div>
          </div>
        )}

        {/* Results Table */}
        {totalAttempts === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No results yet</h2>
            <p className="text-gray-500 mb-6">Complete an exam to see your results here</p>
            <Link href="/student/my-courses" className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
              Go to My Courses
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">All Attempts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Taken</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Rank</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">District Rank</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attempts.map((a, idx) => {
                    const pct = a.total_questions
                      ? Math.round(((a.marks_obtained ?? 0) / a.total_questions) * 100)
                      : 0
                    const date = a.submitted_at
                      ? new Date(a.submitted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'
                    return (
                      <tr key={a.attempt_id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900 max-w-[200px] truncate">{a.exam_title}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {a.subject}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-gray-900">
                          {a.marks_obtained ?? 0}/{a.total_questions ?? 0}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${scoreColor(pct)}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-500 whitespace-nowrap">
                          {a.time_taken_seconds ? formatTime(a.time_taken_seconds) : '—'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {a.overall_rank
                            ? <span className="font-semibold text-teal-700">#{a.overall_rank}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {a.district_rank
                            ? <span className="font-semibold text-blue-700">#{a.district_rank}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-400 whitespace-nowrap text-xs">{date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
