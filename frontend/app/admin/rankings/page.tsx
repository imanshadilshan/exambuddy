'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/lib/redux/hooks'
import { getAdminRankings, AdminRankingRow } from '@/lib/api/admin'

const GRADES = [10, 11, 12, 13]

export default function AdminRankingsPage() {
  const router = useRouter()
  const { user } = useAppSelector((s) => s.auth)

  const [rankings, setRankings] = useState<AdminRankingRow[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState<number | ''>('')

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/')
  }, [user, router])

  useEffect(() => {
    if (!user || user.role !== 'admin') return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subject, grade])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const params: Record<string, any> = { limit: 100 }
      if (subject) params.subject = subject
      if (grade !== '') params.grade = grade

      const data = await getAdminRankings(params)
      setRankings(data.rankings)
      setSubjects(data.subjects)
    } catch {
      setError('Failed to load rankings')
    } finally {
      setLoading(false)
    }
  }

  const medal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rankings</h1>
          <p className="text-sm text-gray-500 mt-1">Student performance leaderboard by subject</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-3">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Grades</option>
            {GRADES.map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          {(subject || grade !== '') && (
            <button
              onClick={() => { setSubject(''); setGrade('') }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">Rank</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">District</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Score %</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Marks</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400">
                      <div className="text-4xl mb-2">🏆</div>
                      <p>No ranking data yet. Students need to complete exams first.</p>
                    </td>
                  </tr>
                ) : (
                  rankings.map((row) => (
                    <tr key={`${row.user_id}-${row.subject}`} className={`hover:bg-gray-50 transition-colors ${row.rank <= 3 ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {medal(row.rank) ? (
                            <span className="text-lg">{medal(row.rank)}</span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-500">#{row.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{row.full_name}</p>
                          <p className="text-xs text-gray-400 hidden sm:block truncate max-w-[200px]">{row.school}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                          {row.subject}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">Grade {row.grade}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{row.district}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${
                          row.score_pct >= 75 ? 'text-green-600' :
                          row.score_pct >= 50 ? 'text-yellow-600' : 'text-red-500'
                        }`}>
                          {row.score_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {row.total_marks}/{row.total_questions}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">{row.attempt_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
