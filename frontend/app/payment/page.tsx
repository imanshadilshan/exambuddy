'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { initiatePaymentThunk, clearPaymentError } from '@/lib/redux/slices/paymentSlice'
import { PaymentInitiateRequest, PaymentResponse } from '@/lib/api/payment'

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  
  const { user } = useAppSelector((state) => state.auth)
  const { isLoading: loading, error } = useAppSelector((state) => state.payment)

  const [paymentMethod, setPaymentMethod] = useState<'payhere' | 'bank_slip'>('payhere')
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [localError, setLocalError] = useState('')

  // Get parameters from URL
  const type = searchParams?.get('type') as 'course' | 'exam'
  const itemId = searchParams?.get('id')
  const itemName = searchParams?.get('name')
  const amount = searchParams?.get('amount')

  useEffect(() => {
    if (!type || !itemId) {
      setLocalError('Invalid payment parameters')
    }
  }, [type, itemId])

  const handleInitiatePayment = async () => {
    if (!type || !itemId) {
      setLocalError('Missing required payment information')
      return
    }

    try {
      dispatch(clearPaymentError())
      setLocalError('')

      const paymentData: PaymentInitiateRequest = {
        payment_type: type,
        payment_method: paymentMethod
      }

      if (type === 'course') {
        paymentData.course_id = itemId
      } else {
        paymentData.exam_id = itemId
      }

      const createdPayment = await dispatch(initiatePaymentThunk(paymentData)).unwrap()
      setPayment(createdPayment)

      // Redirect based on payment method
      if (paymentMethod === 'payhere') {
        router.push(`/payment/payhere?payment_id=${createdPayment.id}`)
      } else {
        router.push(`/payment/bank-slip?payment_id=${createdPayment.id}`)
      }
    } catch (err: any) {
      // Handled by Redux natively if backend error, or local fallback
      if (err?.message) setLocalError(err.message)
    }
  }

  if ((error || localError) && !type) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          {error || localError}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-gray-600 mb-6">Choose your preferred payment method to continue</p>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Payment Summary</h2>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">{type === 'course' ? 'Course' : 'Exam'}:</span>
              <span className="font-medium text-gray-900">{itemName || 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-xl font-bold text-teal-600">LKR {amount || '0'}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Payment Method</h2>
            
            <div className="space-y-3">
              {/* PayHere Option */}
              <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'payhere' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="payhere"
                  checked={paymentMethod === 'payhere'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'payhere')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">PayHere</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Instant Activation</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Pay securely with credit/debit card, bank transfer, or mobile wallet. Your account will be activated immediately after payment.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <img src="/images/visa.png" alt="Visa" className="h-6" />
                    <img src="/images/mastercard.png" alt="Mastercard" className="h-6" />
                    <img src="/images/amex.png" alt="Amex" className="h-6" />
                  </div>
                </div>
              </label>

              {/* Bank Slip Option */}
              <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'bank_slip' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="bank_slip"
                  checked={paymentMethod === 'bank_slip'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'bank_slip')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">Bank Deposit</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Manual Review</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Deposit to our bank account and upload the slip. Account will be activated after admin verification (usually within 24 hours).
                  </p>
                  <div className="text-xs bg-white border border-gray-200 rounded p-2">
                    <p className="font-medium text-gray-900 mb-1">Bank Details:</p>
                    <p className="text-gray-600">Bank: Commercial Bank</p>
                    <p className="text-gray-600">Account: 1234567890</p>
                    <p className="text-gray-600">Name: ExamBuddy (Pvt) Ltd</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error || localError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiatePayment}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <svg className="w-5 h-5 text-green-600 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Your payment information is secure and encrypted
        </div>
      </div>
    </div>
  )
}
