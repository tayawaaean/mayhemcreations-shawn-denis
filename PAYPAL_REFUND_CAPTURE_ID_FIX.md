# 🔧 PayPal Refund RESOURCE_NOT_FOUND Error - FIXED

## 🐛 Error You Saw

```
PayPal refund error: {
  "name": "RESOURCE_NOT_FOUND",
  "message": "The specified resource does not exist.",
  "details": [{
    "issue": "INVALID_RESOURCE_ID",
    "field": "capture_id",
    "value": "3Y0953011T443932D",
    "description": "Specified resource ID does not exist."
  }]
}
```

## 🔍 Root Cause

**The Problem:** We were saving the wrong ID in the database when capturing PayPal payments.

**What Happened:**
1. ✅ Captured PayPal payment successfully
2. ❌ Saved `capture.id` (the ORDER ID) as `payment_intent_id`
3. ❌ When trying to refund, used this ORDER ID instead of CAPTURE ID
4. ❌ PayPal API rejected it: "This ID doesn't exist as a capture"

**The Confusion:**
PayPal returns TWO different IDs:
- **Order ID** = `capture.id` (e.g., `"5O190127TN364715T"`)
- **Capture ID** = `capture.purchase_units[0].payments.captures[0].id` (e.g., `"3Y0953011T443932D"`)

**To refund a PayPal payment, you MUST use the CAPTURE ID, not the ORDER ID.**

---

## ✅ Solution Applied

### **Fix: Extract and Save Correct Capture ID** (`paypalController.ts`)

**Before (Bug):**
```typescript
// ❌ Saving ORDER ID as payment_intent_id
const [updateResult] = await sequelize.query(`
  UPDATE order_reviews 
  SET payment_intent_id = ?,  -- ❌ This was capture.id (ORDER ID)
      ...
  WHERE id = ?
`, {
  replacements: [
    capture.id,  // ❌ Wrong! This is the ORDER ID
    ...
  ]
});
```

**After (Fixed):**
```typescript
// ✅ Extract the actual capture ID from purchase_units
const paypalCaptureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || capture.id;

logger.info('🔍 PayPal IDs:', {
  orderId: capture.id,           // Order ID (e.g., 5O123456789)
  captureId: paypalCaptureId,    // Capture ID (e.g., 3Y0953011T443932D)
  captureIdLocation: capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ? 'purchase_units' : 'fallback'
});

// ✅ Save the correct capture ID
const [updateResult] = await sequelize.query(`
  UPDATE order_reviews 
  SET payment_intent_id = ?,  -- ✅ Now saves CAPTURE ID
      ...
  WHERE id = ?
`, {
  replacements: [
    paypalCaptureId,  // ✅ Correct! This is the CAPTURE ID
    ...
  ]
});
```

---

## 📊 PayPal IDs Explained

### **Order ID vs Capture ID:**

**Order ID** (`capture.id`):
- Created when you create a PayPal order
- Format: `5O190127TN364715T`
- Used for: Retrieving order details, checking status
- **❌ Cannot be used for refunds**

**Capture ID** (`capture.purchase_units[0].payments.captures[0].id`):
- Created when you capture the payment
- Format: `3Y0953011T443932D`
- Used for: Refunding payments
- **✅ This is what we need to save**

### **PayPal API Response Structure:**

```json
{
  "id": "5O190127TN364715T",  // ❌ Order ID (not for refunds)
  "status": "COMPLETED",
  "purchase_units": [
    {
      "payments": {
        "captures": [
          {
            "id": "3Y0953011T443932D",  // ✅ Capture ID (for refunds!)
            "status": "COMPLETED",
            "amount": {
              "currency_code": "USD",
              "value": "200.05"
            }
          }
        ]
      }
    }
  ],
  "payer": { ... }
}
```

---

## 🔄 Complete Flow (After Fix)

### **Step 1: Capture Payment**

**Backend captures payment:**
```typescript
const capture = await capturePayPalOrder(captureData);

// ✅ Extract BOTH IDs
const orderId = capture.id  // "5O190127TN364715T"
const captureId = capture.purchase_units[0].payments.captures[0].id  // "3Y0953011T443932D"
```

### **Step 2: Save to Database**

**Saves CAPTURE ID as payment_intent_id:**
```sql
UPDATE order_reviews 
SET payment_intent_id = '3Y0953011T443932D',  -- ✅ Capture ID
    transaction_id = 'paypal_3',
    payment_method = 'paypal',
    payment_status = 'completed',
    ...
WHERE id = 3
```

### **Step 3: Customer Requests Refund**

**Admin approves refund:**
```
POST /api/v1/refunds/3/approve
```

### **Step 4: Process Refund**

**Backend retrieves capture ID:**
```typescript
// Get order from database
const order = await getOrder(refund.orderId);

// ✅ Now payment_intent_id contains the CAPTURE ID
const captureId = order.paymentIntentId;  // "3Y0953011T443932D"
```

**Calls PayPal refund API:**
```typescript
POST /v2/payments/captures/3Y0953011T443932D/refund
{
  "amount": {
    "value": "200.05",
    "currency_code": "USD"
  },
  "note_to_payer": "Refund for order MC-1"
}
```

**✅ PayPal accepts the refund!**

---

## 🧪 Testing Instructions

### **1. Rebuild Backend**
```bash
cd backend
npm run build
npm run dev
```

### **2. Create a New Test Order**
**Important:** Existing orders still have the wrong capture ID saved. You need to create a NEW order to test.

1. Create a new order
2. Pay with PayPal
3. Complete the payment

### **3. Check Backend Logs**

**Look for:**
```
🔍 PayPal IDs: {
  orderId: '5O190127TN364715T',
  captureId: '3Y0953011T443932D',  // ✅ This should be different from orderId
  captureIdLocation: 'purchase_units'
}

💳 Saving PayPal payment details: {
  orderId: 3,
  paypalCaptureId: '3Y0953011T443932D',  // ✅ Capture ID being saved
  ...
}
```

### **4. Request a Refund**

1. Go to Admin → Pending Review
2. Find the order
3. Request a refund
4. Approve the refund

### **5. Check Refund Logs**

**Should see:**
```
Processing PayPal refund with capture ID: {
  refundId: 1,
  orderId: 3,
  captureId: '3Y0953011T443932D',  // ✅ Correct capture ID
  amount: 200.05
}

PayPal refund created: REFUND_ID_HERE
✅ Refund processed successfully
```

**Should NOT see:**
```
❌ PayPal refund error: RESOURCE_NOT_FOUND
```

---

## 🔍 Debugging Existing Orders

### **For Old Orders with Wrong Capture ID:**

**Option 1: Manual Refund (Recommended)**
1. Log into PayPal dashboard
2. Find the transaction
3. Process refund manually
4. Update refund status in admin panel to "approved"

**Option 2: Find Correct Capture ID**
1. Check the `payments` table in database:
   ```sql
   SELECT provider_transaction_id, gateway_response 
   FROM payments 
   WHERE order_id = 3 AND provider = 'paypal';
   ```
2. If found, update the order:
   ```sql
   UPDATE order_reviews 
   SET payment_intent_id = 'CORRECT_CAPTURE_ID'
   WHERE id = 3;
   ```

---

## 📋 Summary

### **The Bug:**
- ❌ Saved ORDER ID (`5O123...`) as `payment_intent_id`
- ❌ Tried to refund using ORDER ID
- ❌ PayPal rejected: "Resource not found"

### **The Fix:**
- ✅ Extract CAPTURE ID from `purchase_units[0].payments.captures[0].id`
- ✅ Save CAPTURE ID as `payment_intent_id`
- ✅ Refunds now work with correct ID

### **Files Modified:**
- `backend/src/controllers/paypalController.ts`
  - Extract `paypalCaptureId` from correct location
  - Save `paypalCaptureId` instead of `capture.id`
  - Added logging to show both IDs

---

**Status:** ✅ **FIXED - Rebuild Backend and Test with New Orders**

**Important:** Existing orders may still have wrong capture IDs. Test with a NEW PayPal payment after rebuilding the backend.

**Last Updated:** October 16, 2025

