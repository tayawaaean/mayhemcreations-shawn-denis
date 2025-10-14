# Debugging Fallback Rates Issue 🔍

## The Problem

Your shipping rate calculator keeps using fallback rates instead of real ShipEngine rates.

---

## ✅ **New Manual Weight Control**

I've added a **manual weight input** to help debug this issue!

### What Changed:

1. **Weight Input Field** - Now you can manually set the package weight
2. **Console Logging** - Detailed logs in browser console (F12)
3. **Backend Logging** - Enhanced error messages in terminal
4. **Fallback Detection** - Automatic warning when fallback rates are used

### How to Use:

1. Go to **Admin → Shipping → Shipping Management**
2. Scroll to the form
3. You'll see a new **"Package Weight"** section
4. Change the weight value (default: 16 oz)
5. Select unit (oz or lbs)
6. Click "Calculate Shipping Rates"

---

## 🔍 **Step-by-Step Debugging**

### Step 1: Check API Key

**Click "Test API" button (green)**

✅ **Should see:** "ShipEngine API Connection Successful!"

❌ **If it fails:**
```
1. Check backend/.env has SHIPSTATION_API_KEY
2. Restart backend server
3. Verify no spaces or quotes around key
```

---

### Step 2: Check Carriers

**Click "Test Carriers" button (purple)**

✅ **Should see:** "Found X USA Carriers! Stamps.com..."

❌ **If no carriers:**
```
1. Go to https://app.shipengine.com/
2. Navigate to Carriers
3. Add USPS (Stamps.com) - Free tier available
4. Verify carrier is active
5. Click "Test Carriers" again
```

---

### Step 3: Check Browser Console

**Press F12 to open browser console**

When you click "Calculate Shipping Rates", look for:

```javascript
// What's being sent
Calculating rates with: {
  address: { city: "Mountain View", state: "CA", ... },
  weight: { value: 16, unit: "ounce" },
  items: [...]
}

// What you got back
Rate response: {
  success: true/false,
  data: { rates: [...] },
  message: "..."
}
```

**Look for errors:**
- Red error messages
- Failed network requests
- API errors

---

### Step 4: Check Backend Terminal

**Look at your backend terminal logs**

**Success looks like:**
```
info: Retrieved carrier IDs from ShipEngine
  carrierCount: 1,
  carriers: ['Stamps.com']

info: ShipEngine API Request: {
  hasApiKey: true,
  request: { ... }
}

info: ShipEngine rates retrieved successfully
  ratesCount: 5,
  cheapestRate: 7.83
```

**Failure looks like:**
```
error: Error fetching shipping rates from ShipEngine: {
  error: "actual error message here",
  responseData: "{ error details }",
  status: 401 or 400
}

warn: Using fallback shipping rates
```

---

## 🚨 **Common Errors and Fixes**

### Error 1: "No carriers configured"

**Terminal shows:**
```
error: No carriers configured. Please add carriers in your ShipEngine dashboard.
```

**Fix:**
1. Log into https://app.shipengine.com/
2. Go to **Carriers**
3. Click **"Add Carrier"**
4. Select **USPS (Stamps.com)**
5. Follow setup wizard
6. Test again

---

### Error 2: "Invalid API key" or 401 Status

**Terminal shows:**
```
error: Error fetching shipping rates from ShipEngine:
  status: 401
  error: "unauthorized"
```

**Fix:**
1. Go to https://app.shipengine.com/
2. Navigate to **API Management** → **API Keys**
3. Copy your API key
4. Update `backend/.env`:
   ```
   SHIPSTATION_API_KEY=your_actual_key_here
   ```
5. Restart backend server
6. Test again

---

### Error 3: "RESOURCE_NOT_FOUND" or Empty Carrier IDs

**Terminal shows:**
```
error: Failed to fetch carriers
```

**This means:** Carrier IDs couldn't be fetched

**Fix:**
1. Verify API key is for correct environment (sandbox vs production)
2. Check that carriers are actually connected in dashboard
3. Try manually adding a test carrier ID

---

### Error 4: "Insufficient balance" or Funding Required

**Terminal might show:**
```
info: Retrieved carrier IDs
warn: Using fallback shipping rates
```

**Carrier card shows:**
```
⚠️ Requires funded amount: $0.00
```

**Fix:**
1. Log into https://app.shipengine.com/
2. Go to **Carriers** → Select your USPS carrier
3. Click **"Add Funds"**
4. Add $10-$20 for testing
5. Wait a few minutes for funds to appear
6. Test again

---

## 🧪 **Testing with Manual Weight**

Try different weights to see if it's weight-related:

### Test 1: Very Light (4 oz)
```
Weight: 4 oz
Expected: Lower rates (~$5-7)
```

### Test 2: Standard (16 oz / 1 lb)
```
Weight: 16 oz or 1 lbs
Expected: Normal rates (~$7-12)
```

### Test 3: Heavy (64 oz / 4 lbs)
```
Weight: 64 oz or 4 lbs
Expected: Higher rates (~$12-20)
```

**If all show fallback:** Weight is not the issue.

---

## 📊 **How to Identify Fallback vs Real Rates**

### Fallback Rates (Not Working):
```
Only 2 options:
┌─────────────────────────────┐
│ USPS Priority Mail          │
│ $9.99 ← Exact price         │
│ 3 days                      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ USPS Priority Mail Express  │
│ $24.99 ← Exact price        │
│ 2 days                      │
└─────────────────────────────┘
```

**Red flags:**
- Only 2 options
- Exact prices: $9.99 and $24.99
- Generic service names
- No guaranteed badges
- Warning message appears

### Real Rates (Working):
```
Multiple options (3-8):
┌─────────────────────────────┐
│ USPS Parcel Select          │
│ $7.29 ← Varied price        │
│ 5 business days             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ USPS Priority Mail          │
│ $9.83 ← Not exactly $9.99   │
│ 3 business days             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ USPS Priority Mail Express  │
│ $24.95 ← Close but not exact│
│ 2 business days             │
│ ✓ Guaranteed                │
└─────────────────────────────┘
```

**Good signs:**
- 3+ options
- Varied prices ($7.29, $9.83, $12.45, etc.)
- Specific service names
- Some have guaranteed badges
- No warning message

---

## 🔧 **Manual Testing with cURL**

If UI testing fails, test ShipEngine API directly:

```bash
curl -X POST https://api.shipengine.com/v1/addresses/validate \
  -H "API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '[{
    "address_line1": "525 S Winchester Blvd",
    "city_locality": "San Jose",
    "state_province": "CA",
    "postal_code": "95128",
    "country_code": "US"
  }]'
```

**Success response:**
```json
[{
  "status": "verified",
  "original_address": {...},
  "matched_address": {...}
}]
```

**Failure response:**
```json
{
  "errors": [{
    "error_code": "unauthorized",
    "message": "The API key is invalid"
  }]
}
```

---

## 📝 **Debugging Checklist**

Run through this in order:

### Pre-Flight Checks:
- [ ] Backend server is running
- [ ] Frontend is loaded
- [ ] Logged into admin panel
- [ ] On Shipping Management page

### API Key Verification:
- [ ] Click "Test API" → ✅ Success
- [ ] If failed, check `backend/.env`
- [ ] Restart backend after adding key

### Carrier Verification:
- [ ] Click "Test Carriers" → ✅ Shows carriers
- [ ] Carrier cards display below
- [ ] Carrier IDs visible (e.g., se-123890)
- [ ] If no carriers, add in ShipEngine dashboard

### Rate Calculation:
- [ ] Adjust weight if needed (try 8 oz, 16 oz, 32 oz)
- [ ] Click "Calculate Shipping Rates"
- [ ] Open browser console (F12)
- [ ] Check backend terminal
- [ ] Look for detailed error messages

### If Still Failing:
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Verify carrier has funds (if USPS)
- [ ] Try different address
- [ ] Try different weight
- [ ] Copy exact error from terminal

---

## 💡 **Most Common Issue**

**99% of the time it's one of these:**

1. **No API key set** → Add to `backend/.env`
2. **No carriers configured** → Add in ShipEngine dashboard
3. **Wrong environment** → Using sandbox key with production account
4. **No carrier funds** → Add funds to USPS account

---

## 🎯 **Next Steps**

**After fixing the issue:**

1. ✅ "Test API" shows success
2. ✅ "Test Carriers" shows carriers with IDs
3. ✅ "Calculate Rates" shows 3+ varied prices
4. ✅ No warning about fallback rates
5. ✅ Terminal shows "rates retrieved successfully"

**Then you're ready to:**
- Integrate into checkout
- Create shipping labels
- Go live!

---

## 📞 **Need Help?**

**Check these logs:**

1. **Browser Console (F12):**
   - Look for red errors
   - Check network tab
   - See request/response details

2. **Backend Terminal:**
   - Most detailed error info
   - Shows actual API responses
   - Indicates exact problem

3. **ShipEngine Dashboard:**
   - Verify carriers are connected
   - Check account balance
   - View API key status

---

**Share these details if still stuck:**
- Error message from terminal
- Browser console errors
- Screenshot of carrier cards
- Result of "Test API" button
- Result of "Test Carriers" button

Good luck! You got this! 🚀

