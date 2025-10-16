# 🔍 PayPal Payment Status Update - Debug Guide

## 📋 Current Situation

**Your Report:** "The payment is not updating the status to paid when PayPal is used to pay"

**What Should Happen:** After PayPal payment, order status should change from `'pending-payment'` to `'approved-processing'` with `payment_status = 'completed'`.

---

## ✅ Code Review - PayPal IS Updating Status

### **PayPal Capture Handler** (`paypalController.ts`)

**Lines 241-268:** This code updates the order status:
```typescript
UPDATE order_reviews 
SET status = 'approved-processing',        // ✅ Updates status
    payment_status = 'completed',          // ✅ Marks as paid
    payment_method = 'paypal',
    payment_provider = 'paypal',
    payment_intent_id = ?,
    transaction_id = ?,
    order_number = ?,
    shipping_address = ?,
    billing_address = ?,
    subtotal = ?,
    shipping = ?,
    tax = ?,
    total = ?,
    reviewed_at = NOW(),
    updated_at = NOW()
WHERE id = ?
```

**This is identical to how Stripe works!**

---

## 🐛 Possible Issues

### **Issue 1: Order Not Found (Most Likely)**

**The Query:**
```sql
SELECT id, user_id, status, total 
FROM order_reviews 
WHERE user_id = ? AND status = 'pending-payment'
ORDER BY created_at DESC 
LIMIT 1
```

**Possible Problems:**
1. ❌ Order status is **not** `'pending-payment'` when payment is made
2. ❌ Order belongs to different user ID
3. ❌ Multiple orders exist and wrong one is selected

**Added Debug Logging:**
```typescript
logger.info('🔍 Looking for pending-payment order for user:', userId);
logger.info('🔍 Found orders:', {
  count: Array.isArray(orderResult) ? orderResult.length : 0,
  orders: orderResult
});
logger.info('✅ Found order to update:', {
  orderId: order.id,
  currentStatus: order.status,
  currentPaymentStatus: order.payment_status
});
```

---

### **Issue 2: Backend Not Rebuilt**

**Symptom:** Changes not applied  
**Cause:** TypeScript needs to be compiled  
**Solution:** 
```bash
cd backend
npm run build
npm run dev  # restart server
```

---

### **Issue 3: Wrong Order ID**

**The frontend sends:**
```typescript
await paymentsApiService.capturePayPalOrder({
  orderId: paypalToken,  // ← This is PayPal's token, not your order ID
  metadata: {
    orderId: String(orderData.id),  // ← Your actual order ID is here
    ...
  }
})
```

**But the backend uses:**
```typescript
WHERE user_id = ? AND status = 'pending-payment'
```

It's **not using** the `metadata.orderId` to find the specific order!

---

## 🔧 **FIX: Use Specific Order ID**

The issue is that the PayPal capture handler is finding orders by `user_id` and `status = 'pending-payment'`, which could select the **wrong order** if the user has multiple pending orders.

Let me fix this to use the specific order ID from metadata:

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">backend/src/controllers/paypalController.ts

