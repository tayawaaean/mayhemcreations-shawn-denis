export type PaymentProvider = 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual'

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'

export type PaymentMethod = 'card' | 'bank_transfer' | 'digital_wallet' | 'crypto' | 'cash' | 'check'

export interface PaymentLog {
  id: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  amount: number
  currency: string
  provider: PaymentProvider
  paymentMethod: PaymentMethod
  status: PaymentStatus
  transactionId: string
  providerTransactionId: string
  gatewayResponse: any
  createdAt: string
  updatedAt: string
  processedAt?: string
  failedAt?: string
  refundedAt?: string
  refundAmount?: number
  fees: number
  netAmount: number
  metadata: {
    ipAddress?: string
    userAgent?: string
    deviceType?: string
    location?: string
    riskScore?: number
    fraudCheck?: boolean
  }
  notes?: string
  refunds: RefundLog[]
}

export interface RefundLog {
  id: string
  paymentId: string
  amount: number
  reason: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
  processedAt?: string
  notes?: string
}

export interface PaymentLogFilters {
  provider?: PaymentProvider
  status?: PaymentStatus
  paymentMethod?: PaymentMethod
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  customerId?: string
  orderId?: string
  transactionId?: string
}

export interface PaymentLogStats {
  totalTransactions: number
  totalAmount: number
  successfulTransactions: number
  failedTransactions: number
  pendingTransactions: number
  refundedAmount: number
  netRevenue: number
  averageTransactionValue: number
  successRate: number
  providerBreakdown: {
    provider: PaymentProvider
    count: number
    amount: number
    successRate: number
  }[]
}

