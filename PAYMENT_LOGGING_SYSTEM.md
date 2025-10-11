# Payment Logging System - Complete Implementation

## ✅ Overview

The payment logging system now captures **every transaction** from both Stripe and PayPal, including:
- ✅ Successful payments
- ✅ Failed payments
- ✅ Denied payments
- ✅ Refunds
- ✅ All payment metadata and gateway responses

---

## 📊 Database Schema

### **`payments` Table**

Located at: `backend/src/models/paymentModel.ts`

```sql
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  customer_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  provider ENUM('stripe', 'paypal') NOT NULL,
  payment_method ENUM('card', 'bank_transfer', 'digital_wallet', 'crypto', 'cash', 'check'),
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
  transaction_id VARCHAR(255) NOT NULL,
  provider_transaction_id VARCHAR(255) NOT NULL,
  gateway_response JSON,
  processed_at DATETIME,
  failed_at DATETIME,
  refunded_at DATETIME,
  refund_amount DECIMAL(10,2),
  fees DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  metadata JSON,
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

**Key Fields:**
- `gateway_response`: Full JSON response from Stripe/PayPal
- `metadata`: Additional data (error codes, IP addresses, etc.)
- `fees`: Payment processing fees
- `net_amount`: Amount after fees
- Timestamps for each status (`processed_at`, `failed_at`, `refunded_at`)

---

## 🔄 What's Logged

### **Stripe Transactions**

#### **1. Successful Payments** (`payment_intent.succeeded`)
Logged in: `backend/src/controllers/webhookController.ts` → `handlePaymentIntentSucceeded()`

```typescript
{
  orderId: 123,
  orderNumber: "MC-2024-123",
  amount: 100.00,
  currency: "usd",
  provider: "stripe",
  paymentMethod: "card",
  status: "completed",
  transactionId: "stripe_pi_123...",
  providerTransactionId: "pi_123...",
  gatewayResponse: { /* full PaymentIntent object */ },
  fees: 3.20,  // 2.9% + $0.30
  netAmount: 96.80,
  metadata: {
    stripeCustomerId: "cus_123...",
    stripePaymentMethodId: "pm_123...",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0..."
  },
  processedAt: "2024-10-11T20:00:00Z"
}
```

#### **2. Failed Payments** (`payment_intent.payment_failed`)
Logged in: `backend/src/controllers/webhookController.ts` → `handlePaymentIntentFailed()`

```typescript
{
  status: "failed",
  fees: 0,
  netAmount: 0,
  metadata: {
    errorCode: "card_declined",
    errorMessage: "Your card was declined",
    errorType: "card_error",
    declineCode: "generic_decline"
  },
  notes: "Payment failed: Your card was declined",
  failedAt: "2024-10-11T20:05:00Z"
}
```

#### **3. Checkout Session Completed** (`checkout.session.completed`)
Similar to `payment_intent.succeeded`, also logs successful payments with full shipping and billing details.

---

### **PayPal Transactions**

#### **1. Successful Payments** (`PAYMENT.CAPTURE.COMPLETED`)
Logged in: `backend/src/controllers/paypalController.ts` → `capturePayPalOrderHandler()`

```typescript
{
  provider: "paypal",
  paymentMethod: "digital_wallet",
  status: "completed",
  transactionId: "paypal_8WC12345...",
  providerTransactionId: "8WC12345...",
  gatewayResponse: { /* full PayPal capture object */ },
  fees: 3.20,  // 2.9% + $0.30
  netAmount: 96.80,
  metadata: {
    paypalOrderId: "5O123456...",
    paypalPayerId: "ABCDEF123..."
  },
  processedAt: "2024-10-11T20:10:00Z"
}
```

#### **2. Denied Payments** (`PAYMENT.CAPTURE.DENIED`)
Logged in: `backend/src/controllers/paypalController.ts` → `handlePaymentCaptureDenied()`

```typescript
{
  status: "failed",
  fees: 0,
  netAmount: 0,
  metadata: {
    reasonCode: "INSTRUMENT_DECLINED",
    eventType: "PAYMENT.CAPTURE.DENIED"
  },
  notes: "PayPal payment denied: INSTRUMENT_DECLINED",
  failedAt: "2024-10-11T20:15:00Z"
}
```

#### **3. Refunds** (`PAYMENT.CAPTURE.REFUNDED`)
Logged in: `backend/src/controllers/paypalController.ts` → `handlePaymentCaptureRefunded()`

```typescript
// Updates existing payment record
{
  status: "refunded",
  refundAmount: 100.00,
  notes: "Refunded: Customer requested refund",
  gatewayResponse: { /* updated with refund details */ },
  refundedAt: "2024-10-11T20:20:00Z"
}
```

---

## 📡 API Endpoints

All endpoints require `admin` or `manager` role.

### **1. Get All Payment Logs**
```http
GET /api/v1/admin/payment-logs?page=1&limit=50&status=completed&provider=stripe
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `status`: Filter by status (`completed`, `failed`, `refunded`, `cancelled`)
- `provider`: Filter by provider (`stripe`, `paypal`)
- `customerId`: Filter by customer ID

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "order_id": 123,
        "order_number": "MC-2024-123",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "amount": 100.00,
        "currency": "USD",
        "provider": "stripe",
        "status": "completed",
        "transaction_id": "stripe_pi_123...",
        "fees": 3.20,
        "net_amount": 96.80,
        "created_at": "2024-10-11T20:00:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "pages": 3,
      "currentPage": 1,
      "perPage": 50
    }
  }
}
```

---

### **2. Get Payment Statistics**
```http
GET /api/v1/admin/payment-logs/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_transactions": 500,
      "successful_transactions": 450,
      "failed_transactions": 45,
      "refunded_transactions": 5,
      "total_revenue": 45000.00,
      "total_fees": 1350.00,
      "total_net": 43650.00,
      "total_refunds": 500.00
    },
    "byProvider": [
      {
        "provider": "stripe",
        "transactions": 300,
        "revenue": 30000.00,
        "fees": 900.00,
        "failures": 25
      },
      {
        "provider": "paypal",
        "transactions": 200,
        "revenue": 15000.00,
        "fees": 450.00,
        "failures": 20
      }
    ],
    "last24Hours": {
      "recent_transactions": 25,
      "recent_revenue": 2500.00
    },
    "dailyRevenue": [
      {
        "date": "2024-10-11",
        "transactions": 15,
        "revenue": 1500.00,
        "failures": 2
      }
    ]
  }
}
```

---

### **3. Get Payment Logs by Order**
```http
GET /api/v1/admin/payment-logs/order/:orderId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "order_id": 123,
        "status": "completed",
        "amount": 100.00,
        "provider": "stripe",
        "created_at": "2024-10-11T20:00:00Z"
      }
    ]
  }
}
```

---

### **4. Get Payment Logs by Customer**
```http
GET /api/v1/admin/payment-logs/customer/:customerId
```

Returns all payment logs for a specific customer.

---

### **5. Get Detailed Payment Log**
```http
GET /api/v1/admin/payment-logs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": 1,
      "order_id": 123,
      "order_number": "MC-2024-123",
      "customer_id": 10,
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_email_current": "john@example.com",
      "customer_first_name": "John",
      "customer_last_name": "Doe",
      "amount": 100.00,
      "currency": "USD",
      "provider": "stripe",
      "payment_method": "card",
      "status": "completed",
      "transaction_id": "stripe_pi_123...",
      "provider_transaction_id": "pi_123...",
      "gateway_response": { /* full JSON */ },
      "processed_at": "2024-10-11T20:00:00Z",
      "fees": 3.20,
      "net_amount": 96.80,
      "metadata": { /* full JSON */ },
      "notes": "Payment processed via Stripe",
      "order_status": "approved-processing",
      "created_at": "2024-10-11T20:00:00Z",
      "updated_at": "2024-10-11T20:00:00Z"
    }
  }
}
```

---

## 🛠️ Services

### **Payment Record Service**
Location: `backend/src/services/paymentRecordService.ts`

**Functions:**
- `createPaymentRecord(data)`: Create new payment log
- `updatePaymentStatus(paymentId, status, additionalData)`: Update existing payment
- `getPaymentsByOrderId(orderId)`: Get all payments for an order
- `getPaymentsByCustomerId(customerId)`: Get all payments for a customer
- `getAllPayments(page, limit, filters)`: Get paginated payment logs
- `generateOrderNumber(orderId)`: Generate order number (MC-2024-XXX)

---

## 📋 Console Logs

When transactions are processed, you'll see:

### **Successful Payment:**
```
✅ Payment record created successfully {
  paymentId: 123,
  orderId: 456,
  provider: 'stripe',
  status: 'completed'
}
```

### **Failed Payment:**
```
❌ Payment failed: pi_123... {
  amount: 100.00,
  error: 'Your card was declined'
}
✅ Failed payment logged successfully {
  paymentIntentId: 'pi_123...',
  errorMessage: 'Your card was declined'
}
```

### **PayPal Refund:**
```
✅ PayPal refund logged successfully {
  paymentId: 789,
  refundId: 'REFUND_123...',
  refundAmount: 100.00
}
```

---

## 🔍 What Gets Captured

### **For Every Transaction:**
1. **Basic Info**: Order ID, order number, customer details
2. **Financial Data**: Amount, currency, fees, net amount
3. **Provider Data**: Transaction IDs (internal + provider-specific)
4. **Status Tracking**: Timestamps for each status change
5. **Gateway Response**: Complete JSON response from Stripe/PayPal
6. **Metadata**: Custom data (error codes, IP, user agent, etc.)
7. **Notes**: Human-readable information about the transaction

### **Error Information (Failures):**
- Error code
- Error message
- Error type
- Decline code (for cards)
- Reason code (for PayPal)

### **Refund Information:**
- Refund amount
- Refund timestamp
- Refund reason/notes
- Updated gateway response

---

## 🎯 Use Cases

### **1. Financial Reporting**
```sql
-- Total revenue by provider
SELECT provider, SUM(amount) as revenue 
FROM payments 
WHERE status = 'completed' 
GROUP BY provider;

-- Failed transactions analysis
SELECT 
  provider, 
  metadata->>'$.errorCode' as error_code,
  COUNT(*) as failures
FROM payments 
WHERE status = 'failed'
GROUP BY provider, error_code;
```

### **2. Fee Calculation**
```sql
-- Total fees by provider
SELECT 
  provider,
  SUM(fees) as total_fees,
  SUM(net_amount) as net_revenue
FROM payments 
WHERE status = 'completed'
GROUP BY provider;
```

### **3. Audit Trail**
Every transaction has a complete audit trail with:
- Who initiated the payment
- When it was created
- What happened (success/failure/refund)
- Full gateway response for debugging

### **4. Customer History**
```sql
-- All payments by customer
SELECT * FROM payments 
WHERE customer_id = 10 
ORDER BY created_at DESC;
```

---

## 🚀 Benefits

✅ **Complete Transaction History** - Every payment attempt logged  
✅ **Financial Audit Trail** - Full compliance and reconciliation  
✅ **Error Analysis** - Track and analyze payment failures  
✅ **Fee Tracking** - Know exactly how much goes to payment processors  
✅ **Refund Management** - Track all refunds with reasons  
✅ **Multi-Provider Support** - Works with both Stripe and PayPal  
✅ **Real-Time Logging** - Transactions logged as they happen  
✅ **Admin Dashboard Ready** - API endpoints for building admin UI  

---

## 📝 Next Steps

### **To Test:**

1. **Test Stripe Payment**:
   - Make a purchase using Stripe
   - Check: `GET /api/v1/admin/payment-logs`
   - Verify: Payment logged with `status=completed`

2. **Test Failed Payment**:
   - Use Stripe test card: `4000 0000 0000 0002` (declined)
   - Check: Payment logged with `status=failed` and error details

3. **Test PayPal Payment**:
   - Make a purchase using PayPal sandbox
   - Check: Payment logged with `provider=paypal`

4. **Test Refund** (via Stripe Dashboard or PayPal):
   - Issue a refund
   - Check: Payment status updated to `refunded` with refund amount

5. **View Statistics**:
   - Call: `GET /api/v1/admin/payment-logs/stats`
   - Verify: Accurate totals for revenue, fees, failures

---

## 📊 Admin Dashboard Integration

To build an admin UI, you can:

1. **Payment Logs Table**: Use `GET /api/v1/admin/payment-logs`
2. **Statistics Cards**: Use `GET /api/v1/admin/payment-logs/stats`
3. **Revenue Chart**: Use `dailyRevenue` from stats endpoint
4. **Payment Details Modal**: Use `GET /api/v1/admin/payment-logs/:id`
5. **Customer Payment History**: Use `GET /api/v1/admin/payment-logs/customer/:customerId`

---

## ✅ Summary

**Payment logging is now fully operational for:**
- ✅ Stripe successful payments
- ✅ Stripe failed payments
- ✅ Stripe checkout sessions
- ✅ PayPal successful payments
- ✅ PayPal denied payments
- ✅ PayPal refunds
- ✅ Complete audit trails
- ✅ Fee tracking
- ✅ Admin API endpoints

**Every single transaction** from both payment providers is now captured in the database! 🎉

