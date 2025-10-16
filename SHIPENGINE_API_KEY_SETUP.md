# 🔑 ShipEngine API Key Setup Guide

## ❌ Current Error

```
error_code: 'unauthorized'
message: 'Access denied.'
```

**Cause:** Your ShipEngine API key is either missing or invalid.

---

## ✅ How to Fix

### **Step 1: Get Your ShipEngine API Key**

1. Go to [ShipEngine.com](https://www.shipengine.com/)
2. Sign up for a free account or log in
3. Navigate to **API & Integrations**
4. Copy your **API Key**

**Test API Key format:**
```
TEST_abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

**Live API Key format:**
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234
```

---

### **Step 2: Add API Key to .env File**

**Open:** `backend/.env`

**Add or update these lines:**

```env
# ShipEngine API Key (use test key for testing)
SHIPSTATION_API_KEY=TEST_your_shipengine_test_key_here

# OR use this variable name (both work)
SHIPENGINE_API_KEY=TEST_your_shipengine_test_key_here

# Optional: Carrier ID (defaults to se-3697717 if not set)
SHIPENGINE_TEST_CARRIER_ID=se-3697717
```

---

### **Step 3: Get a Test Carrier**

In ShipEngine dashboard:

1. Go to **Carriers**
2. Click **"Connect a Carrier"**
3. Choose **"ShipStation Stamps.com"** (free for testing)
4. Copy the **Carrier ID** (looks like `se-1234567`)
5. Add it to your `.env`:

```env
SHIPENGINE_TEST_CARRIER_ID=se-1234567
```

---

### **Step 4: Restart Your Backend**

```powershell
# Stop the backend (Ctrl+C)
# Then start it again
cd backend
npm run dev
```

**You should see:**
```
✅ ShipEngine API key loaded: TEST_abc123def456...
```

---

## 🧪 Testing

### **Method 1: Use Test/Sandbox Mode**

ShipEngine provides a **test environment** where you can create labels without actually shipping:

```env
# In .env - use TEST_ prefix
SHIPENGINE_API_KEY=TEST_abc123...
```

**Benefits:**
- ✅ No real charges
- ✅ No actual shipments
- ✅ Test tracking numbers
- ✅ Practice label creation

### **Method 2: Production Mode**

For real shipments:

```env
# In .env - use live key (no TEST_ prefix)
SHIPENGINE_API_KEY=abc123def456...
```

**Note:** This will **actually create labels** and may **incur charges**.

---

## 🔍 Verify API Key is Working

When your backend starts, check the console:

### **✅ Success:**
```
✅ ShipEngine API key loaded: TEST_abc123def456...
✅ Database synchronized successfully.
🚀 Server running on http://localhost:5000
```

### **❌ Missing Key:**
```
❌ ShipEngine API key not found!
Please set SHIPENGINE_API_KEY or SHIPSTATION_API_KEY in your .env file
Get your API key from: https://www.shipengine.com/
```

---

## 📋 Complete .env Example

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mayhem_creations
DB_USER=root
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Session
SESSION_SECRET=your_session_secret
SESSION_NAME=mayhem.sid

# ShipEngine (IMPORTANT!)
SHIPENGINE_API_KEY=TEST_your_test_key_here_get_from_shipengine_dashboard
SHIPENGINE_TEST_CARRIER_ID=se-3697717

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox
```

---

## 🎯 What's Fixed in the Code

### **1. API Key Loading**

**Before:**
```typescript
this.apiKey = process.env.SHIPENGINE_API_KEY || ''
```

**After:**
```typescript
// Now supports both variable names
this.apiKey = process.env.SHIPENGINE_API_KEY || 
              process.env.SHIPSTATION_API_KEY || ''

if (!this.apiKey) {
  console.error('❌ ShipEngine API key not found!')
}
```

### **2. Carrier ID Loading**

**Before:**
```typescript
carrier_id: process.env.SHIPENGINE_CARRIER_ID || 'se-123456'
```

**After:**
```typescript
// Now supports multiple variable names and has correct default
carrier_id: process.env.SHIPENGINE_CARRIER_ID || 
            process.env.SHIPENGINE_TEST_CARRIER_ID || 
            'se-3697717'
```

---

## 🆘 Still Getting 401 Error?

### **Check 1: API Key Format**

**Test keys start with `TEST_`:**
```
TEST_abc123def456...
```

**Live keys don't have prefix:**
```
abc123def456...
```

### **Check 2: No Extra Spaces**

```env
# ❌ Wrong (has spaces)
SHIPENGINE_API_KEY = TEST_abc123

# ✅ Correct (no spaces)
SHIPENGINE_API_KEY=TEST_abc123
```

### **Check 3: No Quotes**

```env
# ❌ Wrong (has quotes)
SHIPENGINE_API_KEY="TEST_abc123"

# ✅ Correct (no quotes)
SHIPENGINE_API_KEY=TEST_abc123
```

### **Check 4: Restart Backend**

Changes to `.env` only take effect after restart!

---

## 📊 Testing Label Creation

Once API key is set:

1. ✅ Restart backend
2. ✅ Go to Admin Panel → Orders
3. ✅ Click "View Details" on an order
4. ✅ Click green "Create Label" button
5. ✅ Should see: "Label created! Tracking: 1Z999..."

---

## 🎊 Summary

**To fix the 401 error:**

1. ✅ Get API key from ShipEngine.com
2. ✅ Add to `backend/.env` as `SHIPENGINE_API_KEY=TEST_your_key`
3. ✅ Restart backend server
4. ✅ Check console for "✅ ShipEngine API key loaded"
5. ✅ Try creating label again

**Your label creation should now work!** 🎉

