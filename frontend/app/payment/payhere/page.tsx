'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as paymentApi from '@/lib/api/payment'

declare global {
  interface Window {
    payhere: any
  }
}

export default function PayHerePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <PayHereContent />
    </Suspense>
  )
}

function PayHereContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('payment_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [config, setConfig] = useState<paymentApi.PayHereConfig | null>(null)

  useEffect(() => {
    if (!paymentId) {
      setError('Payment ID is required')
      setLoading(false)
      return
    }

    loadPayHereConfig()
  }, [paymentId])

  const loadPayHereConfig = async () => {
    try {
      setLoading(true)
      const paymentConfig = await paymentApi.getPayHereConfig(paymentId!)
      setConfig(paymentConfig)

      // Load PayHere script
      const script = document.createElement('script')
      script.src = 'https://www.payhere.lk/lib/payhere.js'
      script.async = true
      script.onload = () => {
        console.log('PayHere script loaded')
        setLoading(false)
      }
      script.onerror = () => {
        setError('Failed to load payment gateway')
        setLoading(false)
      }
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load payment configuration')
      setLoading(false)
    }
  }

  const initiatePayHerePayment = () => {
    if (!config || !window.payhere) {
      setError('Payment gateway not ready')
      return
    }

    const payment = {
      sandbox: config.sandbox,
      merchant_id: config.merchant_id,
      return_url: config.return_url,
      cancel_url: config.cancel_url,
      notify_url: config.notify_url,
      order_id: config.order_id,
      items: config.items,
      amount: config.amount,
      currency: config.currency,
      hash: config.hash,
      first_name: config.first_name,
      last_name: config.last_name,
      email: config.email,
      phone: config.phone,
      address: config.address,
      city: config.city,
      country: config.country,
    }

    window.payhere.onCompleted = function onCompleted(orderId: string) {
      console.log('Payment completed. OrderID:', orderId)
      router.push(`/payment/success?order_id=${orderId}`)
    }

    window.payhere.onDismissed = function onDismissed() {
      console.log('Payment dismissed')
      router.push('/payment/cancel')
    }

    window.payhere.onError = function onError(error: string) {
      console.log('Payment error:', error)
      setError(error)
    }

    window.payhere.startPayment(payment)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment gateway...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6">
          <div className="text-center mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ready to Pay</h1>
          <p className="text-gray-600 mb-1">Order ID: {config?.order_id}</p>
          <p className="text-2xl font-bold text-teal-600 mb-4">LKR {config?.amount}</p>
          <p className="text-sm text-gray-500">{config?.items}</p>
        </div>

        <button
          onClick={initiatePayHerePayment}
          className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold mb-3"
        >
          Proceed to Payment
        </button>

        <button
          onClick={() => router.back()}
          className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
        >
          Cancel
        </button>

        <div className="mt-6 text-center text-xs text-gray-500">
          <svg className="w-4 h-4 text-green-600 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Secured by PayHere
        </div>
      </div>
    </div>
  )
}
