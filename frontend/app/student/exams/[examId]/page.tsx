'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as studentApi from '@/lib/api/student'
import { useAppSelector } from '@/lib/redux/hooks'

function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function optionLabel(order: number): string {
  return String.fromCharCode(64 + order)
}

export default function StudentExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.examId as string
  const { user } = useAppSelector((state) => state.auth)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [examData, setExamData] = useState<studentApi.StartExamResponse | null>(null)
  const [result, setResult] = useState<studentApi.SubmitExamResponse | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [isPageVisible, setIsPageVisible] = useState(true)
  const [visibilityWarnings, setVisibilityWarnings] = useState(0)

  const autoSubmitTriggered = useRef(false)

  // Anti-screenshot and screen recording protection
  useEffect(() => {
    if (!examData || result) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPageVisible(false)
        setVisibilityWarnings((prev) => prev + 1)
      } else {
        setIsPageVisible(true)
      }
    }

    const preventScreenshot = (e: KeyboardEvent) => {
      // Prevent common screenshot shortcuts
      if (
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) || // Mac screenshots
        (e.key === 'PrintScreen') || // Windows screenshot
        (e.metaKey && e.key === 'p') // Print
      ) {
        e.preventDefault()
        alert('Screenshots and screen recordings are not allowed during the exam!')
        setVisibilityWarnings((prev) => prev + 1)
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('keydown', preventScreenshot)
    document.addEventListener('contextmenu', preventContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('keydown', preventScreenshot)
      document.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [examData, result])

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const data = await studentApi.startExam(examId)
        setExamData(data)

        const initialAnswers: Record<string, string | null> = {}
        data.questions.forEach((q) => {
          initialAnswers[q.id] = null
        })
        setAnswers(initialAnswers)

        const end = new Date(data.ends_at).getTime()
        const now = Date.now()
        setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)))
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || 'Failed to start exam')
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      init()
    }
  }, [examId])

  useEffect(() => {
    if (!examData || result) return

    const interval = setInterval(() => {
      const end = new Date(examData.ends_at).getTime()
      const now = Date.now()
      const seconds = Math.max(0, Math.floor((end - now) / 1000))
      setTimeLeft(seconds)

      if (seconds === 0 && !autoSubmitTriggered.current) {
        autoSubmitTriggered.current = true
        handleSubmit(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [examData, result])

  const unansweredCount = useMemo(() => {
    if (!examData) return 0
    return examData.questions.filter((q) => !answers[q.id]).length
  }, [answers, examData])

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = async (auto = false) => {
    if (!examData || submitting || result) return

    try {
      setSubmitting(true)
      setError('')

      const payload: studentApi.SubmitExamRequest = {
        answers: examData.questions.map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id] || null,
        })),
      }

      const submitResult = await studentApi.submitExamAttempt(examData.attempt_id, payload)
      setResult(submitResult)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to submit exam')
      if (auto) {
        setError('Time is up and auto-submit failed. Please click Submit Paper now.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getOptionForQuestion = (questionId: string, optionId: string | null) => {
    if (!optionId || !examData) return null
    const question = examData.questions.find((q) => q.id === questionId)
    if (!question) return null
    return question.options.find((o) => o.id === optionId) || null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading exam...</p>
      </div>
    )
  }

  if (error && !examData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  if (!examData) return null

  return (
    <>
      <style jsx>{`
        @media print {
          body { display: none !important; }
        }
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 select-none">
      {/* Watermark Overlay - Anti-screenshot */}
      {!result && examData && user && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-between py-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between px-8">
                {[...Array(4)].map((_, j) => (
                  <div
                    key={j}
                    className="text-gray-400/20 text-xs font-mono transform -rotate-45"
                    style={{ userSelect: 'none' }}
                  >
                    {user.email} • ID: {user.id.slice(0, 8)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blur overlay when page is hidden */}
      {!isPageVisible && !result && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ Warning!</h2>
            <p className="text-gray-800 mb-2">
              Switching tabs or apps during the exam is not allowed.
            </p>
            <p className="text-sm text-gray-600">
              Warnings: {visibilityWarnings}/3
            </p>
            {visibilityWarnings >= 3 && (
              <p className="text-red-600 font-semibold mt-2">
                Multiple violations detected. This may affect your result.
              </p>
            )}
          </div>
        </div>
      )}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" onCopy={(e) => e.preventDefault()}>
        {!result ? (
          <>
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{examData.exam_title}</h1>
                    <p className="text-xs text-gray-600">{examData.subject} • Unanswered: {unansweredCount}</p>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${timeLeft <= 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            <div className="space-y-6">
              {examData.questions.map((question, index) => (
                <div key={question.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className={question.question_image_url ? "flex gap-6" : ""}>
                    <div className={question.question_image_url ? "flex-1" : ""}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        {index + 1}. {question.question_text}
                      </h2>

                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${answers[question.id] === option.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === option.id}
                              onChange={() => handleSelect(question.id, option.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{optionLabel(option.order_number)}.</p>
                              {option.option_text && <p className="text-gray-700">{option.option_text}</p>}
                              {option.option_image_url && (
                                <img
                                  src={option.option_image_url}
                                  alt="Option"
                                  className="mt-2 max-h-28 rounded border border-gray-200 pointer-events-none"
                                  draggable="false"
                                  onContextMenu={(e) => e.preventDefault()}
                                />
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {question.question_image_url && (
                      <div className="w-64 flex-shrink-0">
                        <img
                          src={question.question_image_url}
                          alt={`Question ${index + 1}`}
                          className="w-full h-auto rounded-lg border border-gray-200 sticky top-32 pointer-events-none"
                          draggable="false"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button at End */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold text-lg shadow-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Paper'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Exam Result</h1>
              <p className="text-lg text-gray-800 mb-2">Marks Obtained: <span className="font-bold">{result.marks_obtained} / {result.total_questions}</span></p>
              <p className="text-gray-700 mb-1">Time Taken: {formatTime(result.time_taken_seconds)}</p>
              <p className="text-gray-700">Overall Rank ({result.ranking.subject}): <span className="font-semibold">{result.ranking.overall_rank ?? '-'}</span> | District Rank: <span className="font-semibold">{result.ranking.district_rank ?? '-'}</span></p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Answer Review</h2>
              <div className="space-y-4">
                {result.review.map((item, idx) => {
                  const selected = getOptionForQuestion(item.question_id, item.selected_option_id)
                  const correct = getOptionForQuestion(item.question_id, item.correct_option_id)
                  return (
                    <div key={item.question_id} className={`border rounded-lg p-4 ${item.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <p className="font-medium text-gray-900 mb-2">{idx + 1}. {item.question_text}</p>
                      <p className={`text-sm mb-1 ${item.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </p>
                      <p className="text-sm text-gray-700">Your Answer: {selected ? `${optionLabel(selected.order_number)}${selected.option_text ? `. ${selected.option_text}` : ''}` : 'Not answered'}</p>
                      <p className="text-sm text-gray-700">Correct Answer: {correct ? `${optionLabel(correct.order_number)}${correct.option_text ? `. ${correct.option_text}` : ''}` : '-'}</p>
                      <p className="text-sm text-gray-700 mt-2"><span className="font-medium">Explanation:</span> {item.explanation || 'No explanation provided.'}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/student/courses')}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Browse Courses
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  )
}
