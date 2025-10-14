# How to Test Shipping Rates in Shipping Management 📦

## Quick Start Guide

Your Shipping Management page is ready to test! Here's how to use it.

---

## 🎯 Step-by-Step Testing

### Prerequisites

1. **API Key Set:** `backend/.env` has `SHIPSTATION_API_KEY`
2. **Backend Running:** Server restarted after adding key
3. **At Least One Carrier:** Connected in ShipEngine dashboard

---

### Step 1: Access Shipping Management

1. Log into admin panel
2. Navigate to **Admin → Shipping → Shipping Management**
3. You'll see three test buttons at the top

---

### Step 2: Test API Connection (First!)

**Click the green "Test API" button**

**What it does:**
- Validates your API key using address validation
- Quick test that doesn't need carriers

**Expected Result:**
```
✅ ShipEngine API Connection Successful!

Status: verified
API Key: Valid

Your API key is working correctly!
```

**If it fails:** Check your API key in `backend/.env`

---

### Step 3: Load Carriers

**Click the purple "Test Carriers" button**

**What it does:**
- Fetches all carriers from ShipEngine
- Filters for USA carriers only
- Displays carrier IDs needed for rates

**Expected Result:**
```
✅ Found 1 USA Carriers!

Stamps.com

Carrier IDs loaded successfully.
```

**You'll see carrier cards below showing:**
- Carrier ID (e.g., `se-123890`)
- Service counts
- Balance status

---

### Step 4: Calculate Shipping Rates

#### Using the Pre-Filled Form

The form is **already filled** with a test address:

```
First Name: John
Last Name: Doe
Street: 1600 Amphitheatre Parkway
City: Mountain View
State: CA
ZIP: 94043
Phone: +15105551234
```

**Just click: "Calculate Shipping Rates"**

#### What Happens Behind the Scenes

Your form data gets converted to this API request:

```json
{
  "rate_options": {
    "carrier_ids": ["se-123890"]  ← From "Test Carriers"
  },
  "shipment": {
    "validate_address": "validate_and_clean",
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
}
```

**Key Points:**
- ✅ **Ship From:** Automatically set to your origin (Newark, OH)
- ✅ **Ship To:** Taken from the form
- ✅ **Carrier IDs:** Automatically fetched from carriers
- ✅ **Weight:** 8oz per item × 2 items = 16oz
- ✅ **Dimensions:** Default 12" × 12" × 6" box

---

## ✅ Expected Results

### Success (Real Rates)

You should see **3-8 shipping options** like:

```
┌─────────────────────────────────────┐
│ USPS                                │
│ USPS Priority Mail                  │
│ 3 business days                     │
│ $9.83                               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ USPS                                │
│ USPS Priority Mail Express          │
│ 2 business days                     │
│ $24.95                              │
│ ✓ Guaranteed delivery               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ USPS                                │
│ USPS Parcel Select                  │
│ 5 business days                     │
│ $7.29                               │
└─────────────────────────────────────┘
```

**Characteristics of REAL rates:**
- ✅ Multiple options (3+ services)
- ✅ Varied pricing (not exactly $9.99 or $24.99)
- ✅ Accurate delivery estimates
- ✅ Carrier-specific services
- ✅ Some may have "Guaranteed" badges

---

### Failure (Fallback Rates)

If you see **only 2 options** with these exact prices:

```
USPS Priority Mail - $9.99 (3 days)
USPS Priority Mail Express - $24.99 (2 days)
```

**This means:** API call failed, using fallback rates

**Why it happens:**
- ❌ No carriers configured
- ❌ Invalid API key
- ❌ Carriers not funded
- ❌ Network error

---

## 🔍 How to Verify Real Rates

### Check 1: Price Variation
**Real rates:** Prices like $7.29, $9.83, $12.45
**Fallback rates:** Exact $9.99 and $24.99

### Check 2: Number of Options
**Real rates:** 3-8 different services
**Fallback rates:** Only 2 services

### Check 3: Terminal Logs
**Real rates:**
```
info: Retrieved carrier IDs from ShipEngine
info: ShipEngine rates retrieved successfully
```

**Fallback rates:**
```
error: Error fetching shipping rates from ShipEngine
warn: Using fallback shipping rates
```

### Check 4: Service Names
**Real rates:** Specific like "USPS Parcel Select Ground"
**Fallback rates:** Generic like "USPS Priority Mail"

---

## 🧪 Test Different Scenarios

### Test 1: Nearby Address (Ohio)
```
Street: 123 Main Street
City: Columbus
State: OH
ZIP: 43215
```
**Expected:** Lower rates (~$5-8) due to proximity

### Test 2: Far Address (California)
```
Street: 1600 Amphitheatre Parkway
City: Mountain View
State: CA
ZIP: 94043
```
**Expected:** Higher rates (~$9-15) due to distance

### Test 3: Different Weights
Change the test items in the code:
```typescript
const testItems = [
  { quantity: 1, weight: { value: 4, unit: 'ounce' } }  // Lighter
]
```
**Expected:** Lower rates

---

## 📊 Understanding the Results

### Rate Card Information

Each rate shows:
- **Carrier name** (e.g., USPS, UPS)
- **Service name** (e.g., Priority Mail)
- **Delivery time** (e.g., 3 business days)
- **Price** (e.g., $9.83)
- **Badges:**
  - ✓ Guaranteed delivery
  - Trackable (most services)

### Recommended Rate

The system automatically highlights the **best value**:
- Not the cheapest
- Not the slowest
- Balanced: Good price + reasonable speed
- Usually 2-4 day delivery

---

## 🔧 Troubleshooting

### Problem: No Rates Appear

**Check:**
1. API key is set in `.env`
2. Backend was restarted
3. "Test API" button shows success
4. "Test Carriers" shows at least one carrier

### Problem: Only Fallback Rates

**Fix:**
1. Run "Test Carriers" button
2. Verify carriers appear below
3. Check carrier has balance (if USPS)
4. Check terminal for actual error

### Problem: Error Message

**Common errors:**
```
"No carriers configured"
→ Add carriers in ShipEngine dashboard

"Invalid API key"
→ Check SHIPSTATION_API_KEY in .env

"Failed to fetch carriers"
→ Check internet connection and API key
```

---

## 💡 Tips for Testing

1. **Always test in order:**
   - Test API → Test Carriers → Calculate Rates

2. **Check terminal logs:**
   - Look for detailed error messages
   - Verify carrier IDs are being sent

3. **Use real addresses:**
   - Real city/state/ZIP combinations
   - Valid street addresses help with accuracy

4. **Compare rates:**
   - Test nearby vs far addresses
   - See how distance affects pricing

5. **Note carrier IDs:**
   - Visible in carrier cards
   - Needed for all rate requests
   - Automatically included in requests

---

## 📋 Complete Test Checklist

### Initial Setup
- [ ] API key added to `backend/.env`
- [ ] Backend server restarted
- [ ] Logged into admin panel
- [ ] Navigated to Shipping Management

### Testing Sequence
- [ ] Click "Test API" → Success ✅
- [ ] Click "Test Carriers" → Carriers appear ✅
- [ ] Verify carrier cards show IDs
- [ ] Click "Calculate Shipping Rates"
- [ ] Verify 3+ rate options appear
- [ ] Check prices are varied (not $9.99/$24.99)
- [ ] Click different rates to select them

### Verification
- [ ] Terminal shows "rates retrieved successfully"
- [ ] Multiple carriers shown (if multiple configured)
- [ ] Delivery estimates reasonable
- [ ] Can select different rates
- [ ] Recommended rate is highlighted

---

## 🎯 What Success Looks Like

**Perfect test result:**
```
1. "Test API" → ✅ Success
2. "Test Carriers" → ✅ Found 1 USA Carriers
3. Carrier cards display with IDs
4. "Calculate Rates" → ✅ 5 options appear
5. Prices: $7.29, $9.83, $12.45, $18.99, $24.95
6. Terminal: "ShipEngine rates retrieved successfully"
```

---

## 🚀 Next Steps

Once testing succeeds:

1. **Try different addresses:**
   - Test various states
   - Compare rural vs urban
   - Check international (if applicable)

2. **Adjust default settings:**
   - Change default weight in code
   - Update package dimensions
   - Modify carrier preferences

3. **Integrate into checkout:**
   - Add rate calculation to order flow
   - Let customers select shipping
   - Save selected rate with order

4. **Create shipping labels:**
   - Use selected rate for label creation
   - Download and print labels
   - Track shipments

---

## 📞 Quick Reference

**Admin Page:** Admin → Shipping → Shipping Management

**Test Buttons:**
- 🟢 Test API - Validates API key
- 🟣 Test Carriers - Loads USA carriers
- 🔵 Refresh - Reloads configuration
- 🔵 Calculate Shipping Rates - Gets real rates

**Expected Flow:**
```
Test API → Test Carriers → Calculate Rates → Success! 🎉
```

**Support Docs:**
- `SHIPENGINE_TESTING_GUIDE.md` - Full testing guide
- `SHIPENGINE_FIX_SUMMARY.md` - Recent fixes
- `AUTOMATED_SHIPPING_WORKFLOW.md` - Integration guide

---

**Ready to test?** Just click the buttons in order and watch the magic happen! ✨

