import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import * as paymentApi from '@/lib/api/payment'

interface PaymentState {
  myPayments: paymentApi.PaymentResponse[]
  currentPaymentConfig: paymentApi.PayHereConfig | null
  pendingSlips: paymentApi.BankSlipResponse[]
  allSlips: paymentApi.BankSlipResponse[]
  paymentStats: paymentApi.PaymentStats | null
  
  isLoading: boolean
  error: string | null
}

const initialState: PaymentState = {
  myPayments: [],
  currentPaymentConfig: null,
  pendingSlips: [],
  allSlips: [],
  paymentStats: null,
  
  isLoading: false,
  error: null,
}

export const initiatePaymentThunk = createAsyncThunk(
  'payment/initiate',
  async (data: paymentApi.PaymentInitiateRequest, { rejectWithValue }) => {
    try {
      return await paymentApi.initiatePayment(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to initiate payment')
    }
  }
)

export const fetchPayHereConfigThunk = createAsyncThunk(
  'payment/fetchConfig',
  async (paymentId: string, { rejectWithValue }) => {
    try {
      return await paymentApi.getPayHereConfig(paymentId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch PayHere configuration')
    }
  }
)

export const uploadBankSlipThunk = createAsyncThunk(
  'payment/uploadBankSlip',
  async (data: paymentApi.BankSlipUploadRequest, { rejectWithValue }) => {
    try {
      return await paymentApi.uploadBankSlip(data)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to upload bank slip')
    }
  }
)

export const fetchAdminBankSlipsThunk = createAsyncThunk(
  'payment/fetchAdminSlips',
  async (statusFilter: string | undefined, { rejectWithValue }) => {
    try {
      return await paymentApi.getAllBankSlips(statusFilter)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch bank slips')
    }
  }
)

export const verifyBankSlipThunk = createAsyncThunk(
  'payment/verifyBankSlip',
  async ({ slipId, verification }: { slipId: string, verification: paymentApi.BankSlipVerification }, { rejectWithValue }) => {
    try {
      return await paymentApi.verifyBankSlip(slipId, verification)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to verify bank slip')
    }
  }
)

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null
    },
    clearCurrentConfig: (state) => {
      state.currentPaymentConfig = null
    }
  },
  extraReducers: (builder) => {
    builder
      // initiatePaymentThunk
      .addCase(initiatePaymentThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(initiatePaymentThunk.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(initiatePaymentThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // fetchPayHereConfigThunk
      .addCase(fetchPayHereConfigThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchPayHereConfigThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentPaymentConfig = action.payload
      })
      .addCase(fetchPayHereConfigThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // uploadBankSlipThunk
      .addCase(uploadBankSlipThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(uploadBankSlipThunk.fulfilled, (state) => {
        state.isLoading = false
      })
      .addCase(uploadBankSlipThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // fetchAdminBankSlipsThunk
      .addCase(fetchAdminBankSlipsThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAdminBankSlipsThunk.fulfilled, (state, action) => {
        state.isLoading = false
        state.allSlips = action.payload
      })
      .addCase(fetchAdminBankSlipsThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // verifyBankSlipThunk
      .addCase(verifyBankSlipThunk.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyBankSlipThunk.fulfilled, (state, action) => {
        state.isLoading = false
        // Update the slip in the local state
        const index = state.allSlips.findIndex(s => s.id === action.payload.id)
        if (index !== -1) {
          state.allSlips[index] = action.payload
        }
      })
      .addCase(verifyBankSlipThunk.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const { clearPaymentError, clearCurrentConfig } = paymentSlice.actions
export default paymentSlice.reducer
