# 🎯 PayPal "RESOURCE_NOT_FOUND" Error - FIXED

## 🐛 Error You Saw

```
Error retrieving PayPal Order: {
  "name": "RESOURCE_NOT_FOUND",
  "details": [{
    "issue": "INVALID_RESOURCE_ID",
    "description": "Specified resource ID does not exist."
  }]
}
```

## 🔍 Root Cause

**The Problem:** We were sending the wrong ID to PayPal when trying to capture the payment.

**What Happened:**
1. Created PayPal order → Got back `order.id` (e.g., `"5O123456789"`) and `approvalUrl`
2. Redirected to PayPal → URL like `https://sandbox.paypal.com/checkoutnow?token=EC-ABC123XYZ`
3. PayPal redirected back → URL like `/payment?token=EC-ABC123XYZ&PayerID=XXXXXX`
4. **We tried to capture using the `token` (`EC-ABC123XYZ`)** ❌
5. PayPal said "I don't know this ID!" because the `token` is NOT the order ID

**The Issue:**
- **PayPal Order ID** = `5O123456789` (the actual order ID we need to capture)
- **Approval Token** = `EC-ABC123XYZ` (temporary token in the URL, NOT an order ID)

We were using the **approval token** instead of the **order ID**!

---

## ✅ Solution Applied

### **Fix: Store and Use Actual PayPal Order ID**

**Step 1: Save PayPal Order ID Before Redirect** (`Payment.tsx`)

```typescript
// BEFORE (Bug)
if (response.success && response.data?.approvalUrl) {
  window.location.href = response.data.approvalUrl  // ❌ Lost the order ID!
}

// AFTER (Fixed)
if (response.success && response.data?.approvalUrl) {
  console.log('✅ PayPal order created:', {
    paypalOrderId: response.data.id,  // ✅ The actual order ID
    approvalUrl: response.data.approvalUrl,
    ourOrderId: orderData.id
  })
  
  // Store the actual PayPal order ID in sessionStorage
  sessionStorage.setItem('paypal_order_id', response.data.id)  // ✅ Save it!
  sessionStorage.setItem('paypal_return_expected', String(orderData.id))
  sessionStorage.setItem('paypal_return_timestamp', String(Date.now()))
  
  console.log('💾 Saved PayPal order ID:', response.data.id)
  
  window.location.href = response.data.approvalUrl
}
```

**Step 2: Use Stored Order ID for Capture** (`Payment.tsx`)

```typescript
// BEFORE (Bug)
const handlePayPalReturn = async (paypalToken: string) => {
  const response = await paymentsApiService.capturePayPalOrder({
    orderId: paypalToken,  // ❌ This is EC-ABC123XYZ, not the order ID!
    metadata: { ... }
  })
}

// AFTER (Fixed)
const handlePayPalReturn = async (paypalToken: string) => {
  // Get the actual PayPal order ID from sessionStorage
  const paypalOrderId = sessionStorage.getItem('paypal_order_id')
  
  console.log('🔄 Capturing PayPal payment...', { 
    urlToken: paypalToken,          // EC-ABC123XYZ (not used for capture)
    paypalOrderId: paypalOrderId,   // 5O123456789 ✅ The real order ID
    orderId: orderData?.id
  })

  if (!paypalOrderId) {
    console.error('❌ PayPal order ID not found in sessionStorage')
    showError('PayPal order information missing. Please try again.')
    return
  }

  // Capture using the actual PayPal order ID
  const response = await paymentsApiService.capturePayPalOrder({
    orderId: paypalOrderId,  // ✅ Use the actual order ID!
    metadata: { ... }
  })
}
```

**Step 3: Clean Up After Capture**

```typescript
if (response.success) {
  // Clear all PayPal sessionStorage data
  sessionStorage.removeItem('paypal_order_id')
  sessionStorage.removeItem('paypal_return_expected')
  sessionStorage.removeItem('paypal_return_timestamp')
  console.log('🧹 Cleared PayPal sessionStorage data')
  
  navigate('/my-orders', { ... })
}
```

---

## 📊 Complete Flow (After Fix)

### **Step 1: Create PayPal Order**

**Frontend:**
```
POST /api/v1/payments/paypal/create
```

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "id": "5O190127TN364715T",  // ✅ This is what we need!
    "status": "CREATED",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=EC-5KT123456ABC"
  }
}
```

**Frontend Action:**
```typescript
// Save the actual order ID
sessionStorage.setItem('paypal_order_id', '5O190127TN364715T')

// Redirect to PayPal
window.location.href = "https://www.sandbox.paypal.com/checkoutnow?token=EC-5KT123456ABC"
```

---

### **Step 2: Customer Approves on PayPal**

PayPal redirects back to:
```
http://localhost:3000/payment?token=EC-5KT123456ABC&PayerID=PAYER123&orderId=3
```

---

### **Step 3: Capture Payment**

**Frontend:**
```typescript
const paypalOrderId = sessionStorage.getItem('paypal_order_id')
// paypalOrderId = "5O190127TN364715T" ✅

POST /api/v1/payments/paypal/capture
{
  "orderId": "5O190127TN364715T",  // ✅ Correct!
  "metadata": { ... }
}
```

**Backend:**
```typescript
// Retrieve PayPal order
GET https://api.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T
// ✅ Success!

// Capture payment
POST https://api.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture
// ✅ Payment captured!
```

---

## 🧪 Testing Instructions

### **1. Clear SessionStorage**
```
F12 → Application → Session Storage → Clear All
```

### **2. Create Order and Pay with PayPal**

**Watch console for:**

**Before Redirect:**
```
✅ PayPal order created: {
  paypalOrderId: '5O190127TN364715T',  // ✅ This is saved
  approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=EC-5KT123456ABC',
  ourOrderId: 3
}

💾 Saved PayPal order ID and return flags: {
  paypalOrderId: '5O190127TN364715T',
  ourOrderId: 3
}
```

**After Returning from PayPal:**
```
🔄 Capturing PayPal payment... {
  urlToken: 'EC-5KT123456ABC',         // ❌ Not used for capture
  paypalOrderId: '5O190127TN364715T',  // ✅ This is used
  orderId: 3,
  total: 200.05
}

📤 Sending capture request to backend with PayPal order ID: 5O190127TN364715T
```

**Backend Logs (Should NOT see RESOURCE_NOT_FOUND):**
```
🔍 Looking for order: { userId: 10, specificOrderId: 3 }
✅ Found order to update: { orderId: 3 }
💾 Updating order: { newStatus: 'approved-processing', paymentStatus: 'completed' }
✅ Order status after update: { status: 'approved-processing', payment_status: 'completed' }
```

**Frontend Success:**
```
📦 PayPal capture response: { success: true }
✅ PayPal payment captured successfully
🧹 Cleared PayPal sessionStorage data
Redirecting to /my-orders...
```

---

## 🔍 Debugging

### **If You Still See RESOURCE_NOT_FOUND:**

**Check Browser Console:**
```
🔄 Capturing PayPal payment... {
  paypalOrderId: ???  // ← What is this value?
}
```

**If `paypalOrderId: null`:**
- SessionStorage was cleared or not saved
- Check: `sessionStorage.getItem('paypal_order_id')`
- Should show the PayPal order ID like `5O190127TN364715T`

**If `paypalOrderId` is a token like `EC-XXXXX`:**
- Still using the wrong ID
- Check the code is using `sessionStorage.getItem('paypal_order_id')` not `paypalToken`

---

## 📋 Summary

### **The Bug:**
- ❌ Used URL `token` parameter (`EC-ABC123XYZ`) to capture payment
- ❌ PayPal doesn't recognize this token as an order ID
- ❌ Got `RESOURCE_NOT_FOUND` error

### **The Fix:**
- ✅ Store actual PayPal `order.id` (`5O123456789`) in sessionStorage before redirect
- ✅ Use stored order ID (not URL token) to capture payment
- ✅ PayPal recognizes the correct order ID
- ✅ Payment captures successfully

### **Files Modified:**
- `frontend/src/ecommerce/routes/Payment.tsx`
  - Save `paypal_order_id` to sessionStorage before redirect
  - Retrieve `paypal_order_id` from sessionStorage for capture
  - Clear sessionStorage after successful capture

---

**Status:** ✅ **FIXED - Ready to Test**

**Test it now!** Create a new order, pay with PayPal, and you should see successful capture without RESOURCE_NOT_FOUND errors.

**Last Updated:** October 16, 2025

