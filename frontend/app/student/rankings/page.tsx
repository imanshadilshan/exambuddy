'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAppSelector } from '@/lib/redux/hooks'
import * as studentApi from '@/lib/api/student'

function medalColor(rank: number) {
  if (rank === 1) return 'text-yellow-500'
  if (rank === 2) return 'text-gray-400'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-400'
}

function medalIcon(rank: number) {
  if (rank <= 3) {
    return (
      <svg className={`w-5 h-5 ${medalColor(rank)}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )
  }
  return <span className="text-sm font-bold text-gray-500">#{rank}</span>
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function RankingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <RankingsContent />
    </Suspense>
  )
}

function RankingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  const [subjects, setSubjects] = useState<string[]>([])
  const [activeSubject, setActiveSubject] = useState<string>('')
  const [leaderboard, setLeaderboard] = useState<studentApi.LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<studentApi.LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingBoard, setLoadingBoard] = useState(false)

  // Load subjects on mount
  useEffect(() => {
    const load = async () => {
      try {
        const subs = await studentApi.getRankingSubjects()
        setSubjects(subs)
        const initial = searchParams.get('subject') || subs[0] || ''
        setActiveSubject(initial)
      } catch {
        setSubjects([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load leaderboard when subject changes
  useEffect(() => {
    if (!activeSubject) return
    const load = async () => {
      setLoadingBoard(true)
      try {
        const data = await studentApi.getRankingsLeaderboard(activeSubject, 50)
        setLeaderboard(data)
        setMyRank(data.find((e) => e.is_current_user) ?? null)
      } catch {
        setLeaderboard([])
        setMyRank(null)
      } finally {
        setLoadingBoard(false)
      }
    }
    load()
  }, [activeSubject])

  const handleSubject = (sub: string) => {
    setActiveSubject(sub)
    router.replace(`/student/rankings?subject=${encodeURIComponent(sub)}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading rankings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rankings</h1>
            <p className="text-gray-500 mt-1">Top students by subject — ranked by total score, then fastest time</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Dashboard
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No rankings yet</h2>
            <p className="text-gray-500 mb-6">Rankings appear once students complete exams</p>
            <Link href="/student/courses" className="px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
              Browse Courses
            </Link>
          </div>
        ) : (
          <>
            {/* Subject Tabs */}
            <div className="flex gap-2 flex-wrap mb-6">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => handleSubject(sub)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeSubject === sub
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* My Rank Banner (only when logged in and found) */}
            {isAuthenticated && myRank && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    #{myRank.rank}
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900">Your ranking in {activeSubject}</p>
                    <p className="text-sm text-teal-700">
                      Score: {myRank.score} pts &nbsp;•&nbsp; Time: {formatTime(myRank.time_taken_seconds)} &nbsp;•&nbsp; {myRank.attempts} attempt{myRank.attempts !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-teal-600 bg-teal-100 px-3 py-1 rounded-full">
                  Grade {myRank.grade} • {myRank.district}
                </span>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">{activeSubject} — Top Students</h2>
                {loadingBoard && (
                  <div className="w-5 h-5 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
                )}
              </div>

              {loadingBoard ? (
                <div className="py-16 text-center text-gray-400">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="py-16 text-center text-gray-400">No data for this subject yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">District</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaderboard.map((entry, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            entry.is_current_user
                              ? 'bg-teal-50 border-l-4 border-teal-500'
                              : entry.rank <= 3
                              ? 'bg-yellow-50/40 hover:bg-yellow-50/70'
                              : 'hover:bg-gray-50/70'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center w-8">
                              {medalIcon(entry.rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                entry.is_current_user
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {entry.full_name.trim().charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className={`font-medium ${entry.is_current_user ? 'text-teal-800' : 'text-gray-900'}`}>
                                  {entry.full_name}
                                  {entry.is_current_user && (
                                    <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">You</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-600 max-w-[180px] truncate">{entry.school}</td>
                          <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{entry.district}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                              G{entry.grade}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-gray-900">{entry.score}</td>
                          <td className="px-4 py-4 text-right text-gray-500 whitespace-nowrap">{formatTime(entry.time_taken_seconds)}</td>
                          <td className="px-4 py-4 text-center text-gray-500">{entry.attempts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
