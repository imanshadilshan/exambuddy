'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchRankingExams, fetchLeaderboard, fetchExamRank } from '@/lib/redux/slices/studentDashboardSlice'

function medalColor(rank: number) {
  if (rank === 1) return 'text-yellow-500'
  if (rank === 2) return 'text-gray-400'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-400'
}

function medalIcon(rank: number) {
  if (rank <= 3) {
    return (
      <div className="flex items-center gap-1.5 font-bold">
        <svg className={`w-5 h-5 ${medalColor(rank)} flex-shrink-0`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <span className={medalColor(rank)}>#{rank}</span>
      </div>
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
  const dispatch = useAppDispatch()
  
  const { isAuthenticated } = useAppSelector((state) => state.auth)
  const { 
    rankingExams: exams, 
    leaderboard, 
    examRank: myRank,
    loadingRankings: loadingBoard 
  } = useAppSelector((state) => state.studentDashboard)

  const [activeExamId, setActiveExamId] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [district, setDistrict] = useState('')
  const [loading, setLoading] = useState(true)

  const DISTRICTS = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
    'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
    'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
    'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
  ]

  const availableGroups = Array.from(
    new Set(exams.map((e) => `${e.subject} - ${e.course_title}`))
  ).sort()

  const filteredExams = exams.filter(
    (e) => !selectedGroup || `${e.subject} - ${e.course_title}` === selectedGroup
  )

  // Load exams on mount
  useEffect(() => {
    const initExams = async () => {
      if (exams.length === 0) {
        await dispatch(fetchRankingExams())
      }
      setLoading(false)
    }
    initExams()
  }, [dispatch, exams.length])

  // Clear exam selection if group changes
  useEffect(() => {
    setActiveExamId('')
  }, [selectedGroup])

  // Fetch Leaderboard Network effect
  useEffect(() => {
    if (!activeExamId) return
    dispatch(fetchLeaderboard({ exam_id: activeExamId, district, limit: 50 }))
  }, [dispatch, activeExamId, district])

  // Fetch Personal Rank effect
  useEffect(() => {
    if (!activeExamId || !isAuthenticated) return
    dispatch(fetchExamRank(activeExamId))
  }, [dispatch, activeExamId, isAuthenticated])

  const handleExam = (id: string) => {
    setActiveExamId(id)
  }

  const activeExamDetails = exams.find(e => e.exam_id === activeExamId)

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
            <p className="text-gray-500 mt-1">Top students by specific exam - ranked by score, then fastest time</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Dashboard
          </Link>
        </div>

        {exams.length === 0 ? (
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
            {/* Filter Selectors */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-3 max-w-4xl">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white min-w-[200px]"
              >
                <option value="">All Courses</option>
                {availableGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>

              <select
                value={activeExamId}
                onChange={(e) => handleExam(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white min-w-[250px]"
              >
                <option value="">-- Select an Exam --</option>
                {filteredExams.map((ex) => (
                  <option key={ex.exam_id} value={ex.exam_id}>
                    {ex.exam_title}
                  </option>
                ))}
              </select>

              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">All Districts</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              {(selectedGroup || activeExamId || district) && (
                <button
                  onClick={() => { setSelectedGroup(''); handleExam(''); setDistrict('') }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filters
                </button>
              )}
            </div>

            {/* My Rank Banner (only when logged in and found) */}
            {isAuthenticated && myRank && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                    #{myRank.overall_rank}
                  </div>
                  <div>
                    <p className="font-semibold text-teal-900">Your ranking for <span className="text-teal-700">{activeExamDetails?.exam_title}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-teal-600 bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
                    Island Rank: #{myRank.overall_rank}
                  </span>
                  <span className="text-sm font-medium text-teal-600 bg-teal-100 px-3 py-1 rounded-full border border-teal-200">
                    District Rank: #{myRank.district_rank || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Leaderboard Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-4">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">{activeExamDetails?.exam_title || 'Exam'} Leaderboard</h2>
                {loadingBoard && (
                   <span className="text-sm text-gray-400 animate-pulse">Updating...</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Island Rank</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">District Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">District</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingBoard ? (
                      [...Array(10)].map((_, i) => (
                        <tr key={i}>
                          {[...Array(8)].map((_, j) => (
                            <td key={j} className="px-4 py-4">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : !activeExamId ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-gray-400">
                          <div className="text-4xl mb-2">📋</div>
                          <p>Select an exam from the dropdown above to view its rankings.</p>
                        </td>
                      </tr>
                    ) : leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-gray-400">
                          <div className="text-4xl mb-2">🏆</div>
                          <p>No attempts found for this exam.</p>
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((entry, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-gray-50/70 ${
                            entry.is_current_user
                              ? 'bg-teal-50 border-l-4 border-teal-500'
                              : entry.rank <= 3
                              ? 'bg-yellow-50/40 hover:bg-yellow-50/70'
                              : ''
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 w-8">
                              {entry.rank <= 3 ? (
                                medalIcon(entry.rank)
                              ) : (
                                <span className="text-sm font-semibold text-gray-500">#{entry.rank}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="font-semibold text-gray-500">#{entry.district_rank}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {entry.is_current_user && (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-teal-600 text-white`}>
                                  {entry.full_name.trim().charAt(0).toUpperCase()}
                                </div>
                              )}
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
                          <td className="px-4 py-4 text-gray-500 max-w-[180px] truncate">{entry.school}</td>
                          <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{entry.district}</td>
                          <td className="px-4 py-4 text-center">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                              G{entry.grade}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`font-semibold ${
                              entry.score >= 75 ? 'text-green-600' :
                              entry.score >= 50 ? 'text-yellow-600' : 'text-red-500'
                            }`}>
                              {entry.score}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center text-gray-500 whitespace-nowrap">{formatTime(entry.time_taken_seconds)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
