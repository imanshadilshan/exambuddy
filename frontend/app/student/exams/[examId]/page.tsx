'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import * as studentApi from '@/lib/api/student'
import apiClient from '@/lib/api/client'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { startExam, submitExamAttempt } from '@/lib/redux/slices/examsSlice'
import { markExamAttempted } from '@/lib/redux/slices/coursesSlice'

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
  const dispatch = useAppDispatch()
  
  const { user } = useAppSelector((state) => state.auth)
  const { currentAttempt: examData, studentLoading: loading, studentError: error } = useAppSelector((state) => state.exams)

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<studentApi.SubmitExamResponse | null>(null)
  const [loadingPastResult, setLoadingPastResult] = useState(false)
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
        const action = await dispatch(startExam(examId))

        if (startExam.fulfilled.match(action)) {
          const data = action.payload
          const initialAnswers: Record<string, string | null> = {}
          data.questions.forEach((q) => {
            initialAnswers[q.id] = null
          })
          setAnswers(initialAnswers)
          const end = new Date(data.ends_at).getTime()
          setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)))
        } else if (startExam.rejected.match(action)) {
          const payload = (action as any).payload
          if (payload?.alreadyAttempted) {
            // Fetch the full review for the past attempt
            setLoadingPastResult(true)
            try {
              const resp = await apiClient.get(`/api/v1/student/exams/${examId}/last-attempt`)
              setResult(resp.data)
            } finally {
              setLoadingPastResult(false)
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to start exam:', err)
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

      const payload: studentApi.SubmitExamRequest = {
        answers: examData.questions.map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id] || null,
        })),
      }

      const action = await dispatch(submitExamAttempt({ attemptId: examData.attempt_id, payload }))
      if (submitExamAttempt.fulfilled.match(action)) {
        setResult(action.payload)
        // Update the course card immediately — no need to refetch the whole list
        dispatch(markExamAttempted({
          examId: examId,
          score: action.payload.marks_obtained,
          total: action.payload.total_questions,
        }))
      } else if (auto) {
        alert('Time is up and auto-submit failed. Please click Submit Paper now.')
      }
    } catch (err: any) {
      console.error('Failed to submit exam:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getOptionForQuestion = (questionId: string, optionId: string | null) => {
    if (!optionId) return null
    // First try live exam questions (during/after fresh attempt)
    if (examData) {
      const question = examData.questions.find((q) => q.id === questionId)
      if (question) return question.options.find((o) => o.id === optionId) || null
    }
    // Fallback: options are embedded in the review item (past-attempt view)
    if (result) {
      const item = (result.review as any[]).find((r: any) => r.question_id === questionId)
      if (item?.options) return item.options.find((o: any) => o.id === optionId) || null
    }
    return null
  }

  if (loading || loadingPastResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{loadingPastResult ? 'Loading your previous results...' : 'Loading exam...'}</p>
      </div>
    )
  }

  if (error && !examData && !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {typeof error === 'string' ? error : 'Something went wrong. Please try again.'}
        </div>
      </div>
    )
  }

  // Show result screen even if examData is null (past-attempt view)
  if (!examData && !result) return null

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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8" onCopy={(e) => e.preventDefault()}>
        {!result ? (
          <>
            {/* Fixed Floating Timer */}
            <div className="fixed top-4 sm:top-8 right-4 sm:right-8 z-50">
              <div className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-lg border font-bold text-lg sm:text-xl backdrop-blur-sm ${timeLeft <= 60 ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-white/90 border-gray-200 text-gray-800'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Static Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 mb-4 sm:mb-6">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{examData?.exam_title}</h1>
                    <p className="text-xs text-gray-600">{examData?.subject} • Unanswered: {unansweredCount}</p>
                  </div>
                </div>
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>

            <div className="space-y-6">
              {(examData?.questions ?? []).map((question, index) => (
                <div key={question.id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
                  <div className={question.question_image_url ? "flex flex-col lg:flex-row gap-4 lg:gap-6" : ""}>
                    <div className={question.question_image_url ? "flex-1 order-2 lg:order-1" : ""}>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                        {index + 1}. {question.question_text}
                      </h2>

                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg cursor-pointer ${answers[question.id] === option.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'}`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              checked={answers[question.id] === option.id}
                              onChange={() => handleSelect(question.id, option.id)}
                              className="mt-1 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{optionLabel(option.order_number)}.</p>
                              {option.option_text && <p className="text-sm sm:text-base text-gray-700">{option.option_text}</p>}
                              {option.option_image_url && (
                                <img
                                  src={option.option_image_url}
                                  alt="Option"
                                  className="mt-2 max-h-20 sm:max-h-28 rounded border border-gray-200 pointer-events-none"
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
                      <div className="w-full lg:w-64 flex-shrink-0 order-1 lg:order-2">
                        <img
                          src={question.question_image_url}
                          alt={`Question ${index + 1}`}
                          className="w-full h-auto rounded-lg border border-gray-200 lg:sticky lg:top-32 pointer-events-none max-h-64 sm:max-h-80 lg:max-h-none object-contain"
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
            <div className="mt-6 sm:mt-8 flex justify-center px-4">
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold text-base sm:text-lg shadow-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Paper'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Exam Result</h1>
              <p className="text-base sm:text-lg text-gray-800 mb-2">Marks Obtained: <span className="font-bold">{result.marks_obtained} / {result.total_questions}</span></p>
              <p className="text-sm sm:text-base text-gray-700 mb-1">Time Taken: {formatTime(result.time_taken_seconds)}</p>
              <p className="text-sm sm:text-base text-gray-700">Overall Rank ({result.ranking.subject}): <span className="font-semibold">{result.ranking.overall_rank ?? '-'}</span> | District Rank: <span className="font-semibold">{result.ranking.district_rank ?? '-'}</span></p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Answer Review</h2>
              <div className="space-y-3 sm:space-y-4">
                {result.review.map((item: any, idx: number) => {
                  const selected = getOptionForQuestion(item.question_id, item.selected_option_id)
                  const correct = getOptionForQuestion(item.question_id, item.correct_option_id)
                  return (
                    <div key={item.question_id} className={`border rounded-lg p-3 sm:p-4 ${item.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <p className="text-sm sm:text-base font-medium text-gray-900 mb-2">{idx + 1}. {item.question_text}</p>
                      <p className={`text-xs sm:text-sm mb-1 font-semibold ${item.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                        {item.is_correct ? 'Correct' : 'Incorrect'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-700 break-words">Your Answer: {selected ? `${optionLabel(selected.order_number)}${selected.option_text ? `. ${selected.option_text}` : ''}` : 'Not answered'}</p>
                      <p className="text-xs sm:text-sm text-gray-700 break-words">Correct Answer: {correct ? `${optionLabel(correct.order_number)}${correct.option_text ? `. ${correct.option_text}` : ''}` : '-'}</p>
                      <p className="text-xs sm:text-sm text-gray-700 mt-2 break-words"><span className="font-medium">Explanation:</span> {item.explanation || 'No explanation provided.'}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full sm:w-auto px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-center"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/student/courses')}
                className="w-full sm:w-auto px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
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
