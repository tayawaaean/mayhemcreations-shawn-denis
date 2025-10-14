# ShipEngine Debugging Guide 🔍

## Current Status

Your ShipEngine integration is failing with an error. I've added enhanced logging to help diagnose the issue.

## Step-by-Step Debugging

### Step 1: Verify API Key is Set

**Check your `backend/.env` file:**

```env
# This variable should exist
SHIPSTATION_API_KEY=your_actual_api_key_here
```

**Important Notes:**
- ShipEngine and ShipStation use the **same API key**
- Key format: Test keys start with `TEST_`, production keys don't
- No spaces or quotes around the key
- Example test key: `TEST_abcdefghij1234567890klmnopqrstuvwxyz1234567890`
- Example prod key: `SE-12345678901234567890123456789012`

### Step 2: Restart Backend Server

After adding/updating the API key:
1. Stop the backend server (Ctrl+C)
2. Start it again: `npm run dev`
3. Or let nodemon auto-restart

### Step 3: Test in Admin Panel

1. Go to: **http://localhost:5173/admin/shipping**
2. Fill in test address (pre-filled with Google HQ)
3. Click **"Calculate Shipping Rates"**
4. Check the terminal for detailed error logs

### Step 4: Read the Error Logs

With enhanced logging, you'll now see:

```javascript
// In your terminal, look for:
info: ShipEngine API Request: {
  url: "https://api.shipengine.com/v1/rates",
  hasApiKey: true,  // Should be TRUE
  apiKeyPrefix: "TEST_abc...",  // First 8 chars
  request: { ... }  // Full request payload
}

// If it fails, you'll see:
error: Error fetching shipping rates from ShipEngine: {
  error: "...",  // Error message
  responseData: { ... },  // Full error response from ShipEngine
  status: 401,  // HTTP status code
  hasApiKey: true,
  apiKeyLength: 64  // Should be > 0
}
```

### Step 5: Common Errors and Fixes

#### Error: `401 Unauthorized`
**Cause:** Invalid or missing API key
**Fix:**
```bash
# Verify key is set
echo $SHIPSTATION_API_KEY  # Linux/Mac
echo %SHIPSTATION_API_KEY%  # Windows CMD
$env:SHIPSTATION_API_KEY  # Windows PowerShell

# If empty, add to backend/.env:
SHIPSTATION_API_KEY=your_key_here
```

#### Error: `RESOURCE_NOT_FOUND` or `404`
**Cause:** Wrong API endpoint or carrier not configured
**Fix:**
- Check if you have carriers set up in ShipEngine dashboard
- Verify you're using the correct environment (test vs production)

#### Error: `VALIDATION_ERROR` or `400`
**Cause:** Invalid request format
**Check:** The logged request payload for missing fields

#### Error: `Cannot read property 'data' of undefined`
**Cause:** Network error or API key not set
**Fix:**
- Check internet connection
- Verify API key is set in environment

#### Error: `Using fallback shipping rates`
**Cause:** ShipEngine API call failed, system using hardcoded rates
**Why:** This is expected when API key is missing/invalid

---

## Manual API Test (Optional)

### Test ShipEngine Directly with cURL

```bash
# Replace TEST_YOUR_KEY with your actual key
curl -X POST https://api.shipengine.com/v1/rates \
  -H "API-Key: TEST_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "shipment": {
      "ship_from": {
        "name": "Mayhem Creations",
        "address_line1": "128 Persimmon Dr",
        "city_locality": "Newark",
        "state_province": "OH",
        "postal_code": "43055",
        "country_code": "US"
      },
      "ship_to": {
        "name": "John Doe",
        "address_line1": "1600 Amphitheatre Parkway",
        "city_locality": "Mountain View",
        "state_province": "CA",
        "postal_code": "94043",
        "country_code": "US"
      },
      "packages": [{
        "weight": {
          "value": 16,
          "unit": "ounce"
        },
        "dimensions": {
          "length": 12,
          "width": 12,
          "height": 6,
          "unit": "inch"
        }
      }]
    }
  }'
```

**Expected Success Response:**
```json
{
  "rate_response": {
    "rates": [
      {
        "carrier_friendly_name": "USPS",
        "service_type": "USPS Priority Mail",
        "shipping_amount": {
          "amount": 9.99,
          "currency": "USD"
        },
        "delivery_days": 3
      }
    ]
  }
}
```

**Error Response (Invalid Key):**
```json
{
  "request_id": "...",
  "errors": [
    {
      "error_source": "shipengine",
      "error_type": "security",
      "error_code": "unauthorized",
      "message": "The API key is invalid"
    }
  ]
}
```

---

## Checklist

Before asking for help, verify:

- [ ] API key is added to `backend/.env`
- [ ] Backend server was restarted after adding key
- [ ] No spaces/quotes around API key in `.env`
- [ ] Key is for correct environment (test vs prod)
- [ ] Terminal shows `hasApiKey: true` in logs
- [ ] Terminal shows `apiKeyLength: 64` (or similar non-zero)
- [ ] Checked terminal for detailed error from ShipEngine

---

## Getting Your API Key

### Option 1: ShipEngine Dashboard
1. Go to https://app.shipengine.com/
2. Sign up or sign in
3. Navigate to **API Management** → **API Keys**
4. Create a new key or copy existing one
5. Copy the key (starts with `TEST_` for sandbox)

### Option 2: ShipStation Dashboard
1. Go to https://ss.shipstation.com/
2. Sign in to your account
3. Go to **Settings** → **API Settings**
4. Copy the API Key
5. This same key works for ShipEngine!

---

## Expected Behavior

### With Valid API Key:
```
✅ hasApiKey: true
✅ apiKeyLength: 64
✅ ShipEngine rates retrieved successfully
✅ ratesCount: 5
✅ cheapestRate: 9.99
✅ carriers: ["USPS", "UPS", "FedEx"]
```

### Without API Key (Fallback Mode):
```
⚠️  hasApiKey: false
⚠️  apiKeyLength: 0
⚠️  Using fallback shipping rates
⚠️  Returns hardcoded USPS rates only
```

---

## Next Steps

1. **Add your API key** to `backend/.env`
2. **Restart backend** server
3. **Test in admin** panel (Admin → Shipping)
4. **Check terminal** for detailed logs
5. **Report back** with the specific error message you see

The enhanced logging will now show you exactly what's wrong! 🔍

---

## Quick Reference

**Admin Test Page:** `http://localhost:5173/admin/shipping`

**API Key Location:** `backend/.env`

**Required Variable:** `SHIPSTATION_API_KEY=your_key_here`

**Restart Command:** `cd backend && npm run dev`

**Check Logs:** Look at terminal running backend

---

**Need the error details?** Check your backend terminal now and look for the enhanced error logs!

