import { PaymentLog, PaymentLogStats } from '../types/paymentLogs'

export const mockPaymentLogs: PaymentLog[] = [
  {
    id: 'pay_001',
    orderId: 'order_001',
    orderNumber: 'MC-2024-001',
    customerId: 'cust_001',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    amount: 89.99,
    currency: 'USD',
    provider: 'stripe',
    paymentMethod: 'card',
    status: 'completed',
    transactionId: 'txn_1234567890',
    providerTransactionId: 'pi_1234567890abcdef',
    gatewayResponse: {
      id: 'pi_1234567890abcdef',
      status: 'succeeded',
      amount_received: 8999,
      currency: 'usd',
      payment_method: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:15Z',
    processedAt: '2024-01-15T10:30:15Z',
    fees: 2.70,
    netAmount: 87.29,
    metadata: {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceType: 'desktop',
      location: 'New York, NY',
      riskScore: 0.1,
      fraudCheck: true
    },
    notes: 'Payment processed successfully',
    refunds: []
  },
  {
    id: 'pay_002',
    orderId: 'order_002',
    orderNumber: 'MC-2024-002',
    customerId: 'cust_002',
    customerName: 'Jane Smith',
    customerEmail: 'jane.smith@example.com',
    amount: 156.50,
    currency: 'USD',
    provider: 'paypal',
    paymentMethod: 'digital_wallet',
    status: 'completed',
    transactionId: 'txn_0987654321',
    providerTransactionId: 'PAYID-1234567890ABCDEF',
    gatewayResponse: {
      id: 'PAYID-1234567890ABCDEF',
      state: 'approved',
      amount: {
        total: '156.50',
        currency: 'USD'
      },
      payer: {
        email: 'jane.smith@example.com',
        name: 'Jane Smith'
      }
    },
    createdAt: '2024-01-16T14:22:00Z',
    updatedAt: '2024-01-16T14:22:30Z',
    processedAt: '2024-01-16T14:22:30Z',
    fees: 4.70,
    netAmount: 151.80,
    metadata: {
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      deviceType: 'mobile',
      location: 'Los Angeles, CA',
      riskScore: 0.05,
      fraudCheck: true
    },
    notes: 'PayPal payment approved',
    refunds: []
  },
  {
    id: 'pay_003',
    orderId: 'order_003',
    orderNumber: 'MC-2024-003',
    customerId: 'cust_003',
    customerName: 'Mike Johnson',
    customerEmail: 'mike.johnson@example.com',
    amount: 45.99,
    currency: 'USD',
    provider: 'google_pay',
    paymentMethod: 'digital_wallet',
    status: 'completed',
    transactionId: 'txn_1122334455',
    providerTransactionId: 'google_pay_1234567890',
    gatewayResponse: {
      id: 'google_pay_1234567890',
      status: 'SUCCESS',
      amount: 45.99,
      currency: 'USD',
      paymentMethod: 'GOOGLE_PAY'
    },
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-17T09:15:10Z',
    processedAt: '2024-01-17T09:15:10Z',
    fees: 1.38,
    netAmount: 44.61,
    metadata: {
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
      deviceType: 'mobile',
      location: 'Chicago, IL',
      riskScore: 0.02,
      fraudCheck: true
    },
    notes: 'Google Pay transaction successful',
    refunds: []
  },
  {
    id: 'pay_004',
    orderId: 'order_004',
    orderNumber: 'MC-2024-004',
    customerId: 'cust_004',
    customerName: 'Sarah Wilson',
    customerEmail: 'sarah.wilson@example.com',
    amount: 78.00,
    currency: 'USD',
    provider: 'stripe',
    paymentMethod: 'card',
    status: 'failed',
    transactionId: 'txn_5566778899',
    providerTransactionId: 'pi_failed_1234567890',
    gatewayResponse: {
      id: 'pi_failed_1234567890',
      status: 'failed',
      last_payment_error: {
        code: 'card_declined',
        message: 'Your card was declined.',
        type: 'card_error'
      }
    },
    createdAt: '2024-01-18T16:45:00Z',
    updatedAt: '2024-01-18T16:45:05Z',
    failedAt: '2024-01-18T16:45:05Z',
    fees: 0,
    netAmount: 0,
    metadata: {
      ipAddress: '192.168.1.103',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      deviceType: 'desktop',
      location: 'Miami, FL',
      riskScore: 0.8,
      fraudCheck: true
    },
    notes: 'Card declined - insufficient funds',
    refunds: []
  },
  {
    id: 'pay_005',
    orderId: 'order_005',
    orderNumber: 'MC-2024-005',
    customerId: 'cust_005',
    customerName: 'David Brown',
    customerEmail: 'david.brown@example.com',
    amount: 234.99,
    currency: 'USD',
    provider: 'paypal',
    paymentMethod: 'digital_wallet',
    status: 'refunded',
    transactionId: 'txn_9988776655',
    providerTransactionId: 'PAYID-refund_1234567890',
    gatewayResponse: {
      id: 'PAYID-refund_1234567890',
      state: 'refunded',
      amount: {
        total: '234.99',
        currency: 'USD'
      }
    },
    createdAt: '2024-01-19T11:20:00Z',
    updatedAt: '2024-01-19T15:30:00Z',
    processedAt: '2024-01-19T11:20:15Z',
    refundedAt: '2024-01-19T15:30:00Z',
    refundAmount: 234.99,
    fees: 7.05,
    netAmount: -234.99,
    metadata: {
      ipAddress: '192.168.1.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceType: 'desktop',
      location: 'Seattle, WA',
      riskScore: 0.1,
      fraudCheck: true
    },
    notes: 'Customer requested refund - product defect',
    refunds: [
      {
        id: 'refund_001',
        paymentId: 'pay_005',
        amount: 234.99,
        reason: 'Product defect',
        status: 'completed',
        createdAt: '2024-01-19T15:30:00Z',
        processedAt: '2024-01-19T15:30:00Z',
        notes: 'Full refund processed'
      }
    ]
  },
  {
    id: 'pay_006',
    orderId: 'order_006',
    orderNumber: 'MC-2024-006',
    customerId: 'cust_006',
    customerName: 'Lisa Davis',
    customerEmail: 'lisa.davis@example.com',
    amount: 67.50,
    currency: 'USD',
    provider: 'stripe',
    paymentMethod: 'card',
    status: 'pending',
    transactionId: 'txn_4433221100',
    providerTransactionId: 'pi_pending_1234567890',
    gatewayResponse: {
      id: 'pi_pending_1234567890',
      status: 'requires_payment_method',
      next_action: {
        type: 'use_stripe_sdk'
      }
    },
    createdAt: '2024-01-20T13:10:00Z',
    updatedAt: '2024-01-20T13:10:00Z',
    fees: 0,
    netAmount: 0,
    metadata: {
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      deviceType: 'mobile',
      location: 'Denver, CO',
      riskScore: 0.3,
      fraudCheck: false
    },
    notes: 'Payment requires additional authentication',
    refunds: []
  }
]

export const mockPaymentLogStats: PaymentLogStats = {
  totalTransactions: 6,
  totalAmount: 672.97,
  successfulTransactions: 3,
  failedTransactions: 1,
  pendingTransactions: 1,
  refundedAmount: 234.99,
  netRevenue: 437.98,
  averageTransactionValue: 112.16,
  successRate: 75.0,
  providerBreakdown: [
    {
      provider: 'stripe',
      count: 3,
      amount: 201.48,
      successRate: 66.7
    },
    {
      provider: 'paypal',
      count: 2,
      amount: 391.49,
      successRate: 50.0
    },
    {
      provider: 'google_pay',
      count: 1,
      amount: 45.99,
      successRate: 100.0
    }
  ]
}

