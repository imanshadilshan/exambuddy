/**
 * Payment API Client
 */
import api from './client'

export interface PaymentInitiateRequest {
  payment_type: 'course' | 'exam'
  course_id?: string
  exam_id?: string
  payment_method: 'payhere' | 'bank_slip'
}

export interface PaymentResponse {
  id: string
  user_id: string
  payment_type: string
  course_id?: string
  exam_id?: string
  amount: number
  payment_method: string
  status: string
  payhere_order_id?: string
  created_at: string
  completed_at?: string
}

export interface PayHereConfig {
  merchant_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  order_id: string
  items: string
  currency: string
  amount: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  hash: string
  sandbox: boolean
}

export interface BankSlipUploadRequest {
  payment_id: string
  bank_name?: string
  depositor_name?: string
  deposit_date?: string
  reference_number?: string
  slip_image: File
}

export interface BankSlipResponse {
  id: string
  payment_id: string
  user_id: string
  slip_image_url: string
  slip_image_public_id?: string
  bank_name?: string
  depositor_name?: string
  deposit_date?: string
  reference_number?: string
  status: string
  verified_by?: string
  verified_at?: string
  rejection_reason?: string
  created_at: string
}

// Student Payment APIs

export async function initiatePayment(data: PaymentInitiateRequest): Promise<PaymentResponse> {
  const response = await api.post('/api/v1/payment/initiate', data)
  return response.data
}

export async function getPayHereConfig(paymentId: string): Promise<PayHereConfig> {
  const response = await api.get(`/api/v1/payment/payhere/config?payment_id=${paymentId}`)
  return response.data
}

export async function uploadBankSlip(data: BankSlipUploadRequest): Promise<BankSlipResponse> {
  const formData = new FormData()
  formData.append('payment_id', data.payment_id)
  if (data.bank_name) formData.append('bank_name', data.bank_name)
  if (data.depositor_name) formData.append('depositor_name', data.depositor_name)
  if (data.deposit_date) formData.append('deposit_date', data.deposit_date)
  if (data.reference_number) formData.append('reference_number', data.reference_number)
  formData.append('slip_image', data.slip_image)

  const response = await api.post('/api/v1/payment/bank-slip/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function getMyPayments(): Promise<PaymentResponse[]> {
  const response = await api.get('/api/v1/payment/my-payments')
  return response.data
}

export async function getPaymentDetails(paymentId: string): Promise<PaymentResponse> {
  const response = await api.get(`/api/v1/payment/payment/${paymentId}`)
  return response.data
}

// Admin Payment APIs

export async function getPendingBankSlips(): Promise<BankSlipResponse[]> {
  const response = await api.get('/api/v1/admin/payment/pending-slips')
  return response.data
}

export async function getAllBankSlips(statusFilter?: string): Promise<BankSlipResponse[]> {
  const params = statusFilter ? `?status_filter=${statusFilter}` : ''
  const response = await api.get(`/api/v1/admin/payment/all-slips${params}`)
  return response.data
}

export async function getBankSlipDetails(slipId: string): Promise<BankSlipResponse> {
  const response = await api.get(`/api/v1/admin/payment/slip/${slipId}`)
  return response.data
}

export interface BankSlipVerification {
  status: 'verified' | 'rejected'
  rejection_reason?: string
}

export async function verifyBankSlip(slipId: string, verification: BankSlipVerification): Promise<BankSlipResponse> {
  const response = await api.post(`/api/v1/admin/payment/verify-slip/${slipId}`, verification)
  return response.data
}

export interface PaymentStats {
  total_payments: number
  completed_payments: number
  pending_payments: number
  total_revenue: number
  bank_slips: {
    pending: number
    verified: number
    rejected: number
  }
}

export async function getPaymentStats(): Promise<PaymentStats> {
  const response = await api.get('/admin/payment/payment-stats')
  return response.data
}

export async function getAllPayments(statusFilter?: string, paymentMethod?: string): Promise<PaymentResponse[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)
  if (paymentMethod) params.append('payment_method', paymentMethod)
  
  const queryString = params.toString()
  const response = await api.get(`/admin/payment/all-payments${queryString ? `?${queryString}` : ''}`)
  return response.data
}
