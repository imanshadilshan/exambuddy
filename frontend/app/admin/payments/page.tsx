'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { fetchAdminBankSlipsThunk, verifyBankSlipThunk, clearPaymentError } from '@/lib/redux/slices/paymentSlice'
import * as paymentApi from '@/lib/api/payment'

export default function AdminPaymentPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { allSlips: bankSlips, isLoading: loading, error } = useAppSelector((state) => state.payment)

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [localError, setLocalError] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null)
  const [selectedSlip, setSelectedSlip] = useState<paymentApi.BankSlipResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const getSlipImageUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    if (!apiUrl) {
      console.error('NEXT_PUBLIC_API_URL is not configured')
      return ''
    }
    return `${apiUrl}${url}`
  }

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadBankSlips()
  }, [activeTab, user])

  const loadBankSlips = async () => {
    try {
      dispatch(clearPaymentError())
      const filter = activeTab === 'pending' ? 'pending' : undefined
      await dispatch(fetchAdminBankSlipsThunk(filter)).unwrap()
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to load bank slips')
    }
  }

  const handleVerify = async (slipId: string) => {
    try {
      setVerifying(slipId)
      setLocalError('')
      await dispatch(verifyBankSlipThunk({ slipId, verification: { status: 'verified' } })).unwrap()
      // Optional: reload all slips or let Redux slice update it
      // The slice currently updates the item in `allSlips`
      setSelectedSlip(null)
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to verify bank slip')
    } finally {
      setVerifying(null)
    }
  }

  const handleReject = async (slipId: string) => {
    if (!rejectionReason.trim()) {
      setLocalError('Please provide a rejection reason')
      return
    }

    try {
      setVerifying(slipId)
      setLocalError('')
      
      await dispatch(verifyBankSlipThunk({ 
        slipId, 
        verification: { status: 'rejected', rejection_reason: rejectionReason } 
      })).unwrap()

      setSelectedSlip(null)
      setRejectionReason('')
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to reject bank slip')
    } finally {
      setVerifying(null)
    }
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-1">Review and verify student payment submissions</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Review ({bankSlips.filter(s => s.status === 'pending').length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'all'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Submissions
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading submissions...</p>
              </div>
            ) : error || localError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error || localError}
              </div>
            ) : bankSlips.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No bank slips to review</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Bank</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Depositor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Reference</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Submitted</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bankSlips.map((slip) => (
                      <tr key={slip.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            slip.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : slip.status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {slip.status.charAt(0).toUpperCase() + slip.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{slip.bank_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{slip.depositor_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{slip.reference_number || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {new Date(slip.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedSlip(slip)}
                            className="text-teal-600 hover:text-teal-700 font-medium text-xs"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slip Detail Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">Bank Slip Review</h2>
                <button
                  onClick={() => {
                    setSelectedSlip(null)
                    setRejectionReason('')
                    setLocalError('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image */}
              <div className="mb-4">
                <img
                  src={getSlipImageUrl(selectedSlip.slip_image_url)}
                  alt="Bank slip"
                  className="w-full rounded border border-gray-200"
                />
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedSlip.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedSlip.status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedSlip.status.charAt(0).toUpperCase() + selectedSlip.status.slice(1)}
                  </span>
                </div>
                {selectedSlip.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Bank:</span>
                    <span className="text-gray-900">{selectedSlip.bank_name}</span>
                  </div>
                )}
                {selectedSlip.depositor_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Depositor:</span>
                    <span className="text-gray-900">{selectedSlip.depositor_name}</span>
                  </div>
                )}
                {selectedSlip.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Ref No.:</span>
                    <span className="text-gray-900 font-mono">{selectedSlip.reference_number}</span>
                  </div>
                )}
                {selectedSlip.deposit_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Deposit Date:</span>
                    <span className="text-gray-900">{new Date(selectedSlip.deposit_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Submitted:</span>
                  <span className="text-gray-900 text-xs">{new Date(selectedSlip.created_at).toLocaleString()}</span>
                </div>

                {selectedSlip.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-3">
                    <p className="text-xs font-medium text-red-900 mb-1">Rejection Reason:</p>
                    <p className="text-xs text-red-700">{selectedSlip.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedSlip.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide reason if rejecting..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  {(error || localError) && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                      {error || localError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(selectedSlip.id)}
                      disabled={verifying === selectedSlip.id}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                      {verifying === selectedSlip.id ? 'Processing...' : 'Reject'}
                    </button>
                    <button
                      onClick={() => handleVerify(selectedSlip.id)}
                      disabled={verifying === selectedSlip.id}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {verifying === selectedSlip.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
