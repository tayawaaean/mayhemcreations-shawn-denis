# ShipEngine Testing Guide 🧪

## Overview

This guide explains the three-step testing process for ShipEngine integration, with a focus on USA carriers.

---

## 🎯 Three-Step Testing Process

### Step 1: Test API Connection ✅
**Button:** Green "Test API" button

**What it does:**
- Tests ShipEngine API key validity using [address validation](https://www.shipengine.com/docs/addresses/validation/)
- **Doesn't require carriers** to be configured
- Fastest way to verify API key is working

**How it works:**
```
User clicks "Test API"
    ↓
Send test address: "525 S Winchester Blvd, San Jose, CA 95128"
    ↓
ShipEngine validates address
    ↓
Returns success/failure
```

**Expected Results:**
- ✅ **Success:** "ShipEngine API Connection Successful! API Key: Valid"
- ❌ **Failure:** "Invalid API key" or "API key not configured"

---

### Step 2: Test Carriers 🚚
**Button:** Purple "Test Carriers" button

**What it does:**
- Fetches all carriers from [List Carriers endpoint](https://www.shipengine.com/docs/reference/list-carriers/)
- **Filters for USA carriers only**
- Displays carrier IDs and service counts

**USA Carrier Filter:**
```typescript
const usaCarriers = carriers.filter((carrier) => {
  return carrier.services?.some((service) => service.domestic === true) ||
         ['stamps_com', 'ups', 'fedex', 'usps'].includes(carrier.carrier_code)
})
```

**What gets displayed:**
- Carrier name (e.g., "Stamps.com", "UPS")
- Carrier code (e.g., "stamps_com", "ups")
- **Carrier ID** (e.g., "se-123890") - needed for rate requests
- Domestic service count
- International service count
- Account balance (if applicable)
- Primary carrier indicator

**Expected Results:**
- ✅ **Success:** "Found X USA Carriers! USPS, UPS, FedEx..."
- ⚠️ **No Carriers:** "No carriers configured. Please add carriers in ShipEngine dashboard"

---

### Step 3: Calculate Rates 💰
**Button:** Blue "Calculate Shipping Rates" button

**What it does:**
- Uses carrier IDs from Step 2
- Calculates real shipping rates
- Compares multiple carriers

**Expected Results:**
- ✅ **Success:** Real rates from configured carriers
- ❌ **Failure (no carriers):** "No carriers configured"
- ❌ **Failure (API key):** Fallback to estimated rates

---

## 📊 Carrier Display

### USA Carriers Section

Each carrier card shows:

```
┌─────────────────────────────────────────┐
│ ⭐ Stamps.com          [Primary]        │
│ Code: stamps_com                        │
│                                         │
│ Carrier ID:                             │
│ se-123890                               │
│                                         │
│ [Domestic: 5 services]                  │
│ [International: 3 services]             │
│                                         │
│ ⚠️ Requires funded amount: $0.00        │
└─────────────────────────────────────────┘
```

### Why USA Carriers Only?

**Filtered based on:**
1. Carriers with `domestic: true` services
2. Common USA carrier codes: `stamps_com`, `ups`, `fedex`, `usps`

**Benefits:**
- Cleaner display
- Relevant for US-based business (shipping from Ohio)
- Faster rate calculations
- Easier carrier management

---

## 🔧 Configuration Requirements

### For Address Validation Test:
- ✅ API key in `backend/.env`
- ❌ No carriers needed
- ❌ No account funding needed

### For Carriers Test:
- ✅ API key in `backend/.env`
- ✅ At least one carrier connected in ShipEngine
- ❌ No account funding needed (yet)

### For Rate Calculation:
- ✅ API key in `backend/.env`
- ✅ At least one carrier connected in ShipEngine
- ✅ Carrier account funded (for ShipStation carriers like USPS)

---

## 🎨 UI Features

### Header Buttons

```
┌──────────────────────────────────────────────┐
│ [✓ Test API] [🚚 Test Carriers] [⟳ Refresh] │
└──────────────────────────────────────────────┘
```

1. **Test API (Green)** - Quick API key validation
2. **Test Carriers (Purple)** - Load and display USA carriers
3. **Refresh (Blue)** - Reload configuration

### Carrier Cards

**Color-coded information:**
- 🟢 **Green:** Primary carrier badge
- 🔵 **Blue:** Domestic services count
- 🟣 **Purple:** International services count
- 🟠 **Orange:** Funding required warning

**Key information visible:**
- Carrier ID (for API requests)
- Service counts (quick reference)
- Balance status (for funded carriers)

---

## 📋 Testing Checklist

### Before Testing:
- [ ] API key added to `backend/.env`
- [ ] Backend server restarted
- [ ] Logged into admin panel
- [ ] Navigated to **Admin → Shipping → Shipping Management**

### Test Sequence:

**1. API Connection Test:**
- [ ] Click "Test API" button
- [ ] Verify success message
- [ ] If failed, check API key in `.env`

**2. Carriers Test:**
- [ ] Click "Test Carriers" button
- [ ] Verify USA carriers appear
- [ ] Check carrier IDs are visible
- [ ] Note service counts
- [ ] If no carriers, add them in ShipEngine dashboard

**3. Rate Calculation:**
- [ ] Enter test address (pre-filled)
- [ ] Click "Calculate Shipping Rates"
- [ ] Verify real rates appear (not fallback)
- [ ] Check multiple carrier options
- [ ] If using fallback, check carrier funding

---

## 🚀 Common Scenarios

### Scenario 1: New Setup (No Carriers)

**Test API:**
- ✅ Success

**Test Carriers:**
- ❌ "No carriers configured"

**Action Required:**
1. Log into https://app.shipengine.com/
2. Go to **Carriers**
3. Add USPS (Stamps.com) - Free tier available
4. Click "Test Carriers" again

---

### Scenario 2: Carriers Added (No Funding)

**Test API:**
- ✅ Success

**Test Carriers:**
- ✅ "Found 1 USA Carriers! Stamps.com"
- Shows: "Requires funded amount: $0.00"

**Calculate Rates:**
- ⚠️ May work for rate quotes
- ❌ Can't create labels without funding

**Action Required:**
1. Fund USPS account in ShipEngine dashboard
2. Add $10-$20 for testing

---

### Scenario 3: Fully Configured

**Test API:**
- ✅ Success

**Test Carriers:**
- ✅ "Found 1 USA Carriers! Stamps.com"
- Shows: "Requires funded amount: $15.50"

**Calculate Rates:**
- ✅ Real rates from USPS
- ✅ Multiple service options
- ✅ Accurate delivery estimates

**Result:** Ready for production! 🎉

---

## 📖 API References

### Address Validation
- **Endpoint:** `POST /v1/addresses/validate`
- **Docs:** https://www.shipengine.com/docs/addresses/validation/
- **Purpose:** Validate API key and addresses
- **No carriers needed:** ✅

### List Carriers
- **Endpoint:** `GET /v1/carriers`
- **Docs:** https://www.shipengine.com/docs/reference/list-carriers/
- **Purpose:** Get carrier IDs and service info
- **Requires:** Connected carriers in dashboard

### Calculate Rates
- **Endpoint:** `POST /v1/rates`
- **Docs:** https://www.shipengine.com/docs/rates/
- **Purpose:** Get real shipping rates
- **Requires:** Carrier IDs (from List Carriers)

---

## 🔍 Troubleshooting

### "Test API" Fails

**Error:** "Invalid API key"
**Fix:** 
1. Check `backend/.env` has `SHIPSTATION_API_KEY`
2. Verify no extra spaces or quotes
3. Get new key from ShipEngine dashboard
4. Restart backend

---

### "Test Carriers" Returns Empty

**Error:** "No carriers configured"
**Fix:**
1. Log into https://app.shipengine.com/
2. Add at least one USA carrier (USPS recommended)
3. Verify carrier is active
4. Click "Test Carriers" again

---

### "Calculate Rates" Uses Fallback

**Symptom:** Only shows USPS Priority ($9.99) and Express ($24.99)
**Cause:** API call failed, using hardcoded fallback rates

**Fix:**
1. Run "Test API" - verify it works
2. Run "Test Carriers" - verify carriers exist
3. Check carrier funding status
4. Check terminal logs for actual error
5. Verify carrier IDs are being sent in rate request

---

## 💡 Tips

1. **Test in order:** API → Carriers → Rates
2. **Check terminal logs** for detailed error messages
3. **USA carriers only** keeps display clean and relevant
4. **Carrier IDs are crucial** - needed for all rate requests
5. **USPS is easiest** to start with (free tier available)

---

## 📝 Summary

**Three simple steps:**
1. **Test API** - Validates your key (no carriers needed)
2. **Test Carriers** - Shows USA carriers with IDs
3. **Calculate Rates** - Gets real shipping prices

**USA Carrier Filtering:**
- Automatic filtering for domestic carriers
- Cleaner display
- Faster testing
- Relevant for US business

**Key Features:**
- Visual carrier cards with IDs
- Service counts per carrier
- Balance warnings
- One-click testing

**Ready to test!** 🚀

---

## Next Steps

Once all tests pass:
1. ✅ Integrate into checkout flow
2. ✅ Add label creation
3. ✅ Test with real orders
4. ✅ Go live!


