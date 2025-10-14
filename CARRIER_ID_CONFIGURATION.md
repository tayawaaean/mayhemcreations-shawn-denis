# Carrier ID Configuration 🚚

## ✅ **Carrier ID `se-3697717` is Now Configured!**

Your test rate calculator will now use carrier ID **`se-3697717`** automatically.

---

## 🎯 **How It Works**

### **Automatic Fallback System:**

```javascript
1. Try to fetch carriers from ShipEngine API
   ↓
2. If API returns carriers → Use those
   ↓
3. If NO carriers found → Use se-3697717
   ↓
4. If API fails completely → Use se-3697717
```

### **Configuration Priority:**

```
1st: options?.carrierIds (if provided in code)
2nd: SHIPENGINE_TEST_CARRIER_ID (from .env)
3rd: 'se-3697717' (hardcoded default)
```

---

## 🔧 **Current Setup**

### **Hardcoded in Service:**

`backend/src/services/shipEngineService.ts` line 195:

```typescript
const testCarrierId = process.env.SHIPENGINE_TEST_CARRIER_ID || 'se-3697717';
```

### **Fallback Logic:**

```typescript
if (carrierIds.length === 0) {
  try {
    // Try to fetch from API
    const carriers = await getCarriers();
    carrierIds = carriers.map(c => c.carrier_id);
    
    // If no carriers found
    if (carrierIds.length === 0) {
      logger.warn('Using test carrier ID: se-3697717');
      carrierIds = ['se-3697717'];  // ✅ YOUR CARRIER
    }
  } catch (error) {
    logger.warn('Falling back to test carrier ID: se-3697717');
    carrierIds = ['se-3697717'];  // ✅ YOUR CARRIER
  }
}
```

---

## 📝 **Environment Variable (Optional)**

You can also set this in your `backend/.env`:

```env
# ShipEngine Carrier Configuration (Optional)
SHIPENGINE_TEST_CARRIER_ID=se-3697717
```

**Benefits of using .env:**
- Easy to change without editing code
- Can use different carriers for different environments
- Can override the hardcoded default

**Example for different carrier:**
```env
SHIPENGINE_TEST_CARRIER_ID=se-1234567
```

---

## 🧪 **How to Test**

### **Option 1: Use Default (Current Setup)**

Just test as normal - it will use `se-3697717` automatically:

```bash
1. Go to Admin → Shipping → Shipping Management
2. Click "Test Carriers" (will try to fetch, then fall back to se-3697717)
3. Click "Calculate Shipping Rates"
4. Should use carrier se-3697717
```

### **Option 2: Set in Environment**

Add to your `backend/.env`:

```env
SHIPSTATION_API_KEY=your_api_key_here
SHIPENGINE_TEST_CARRIER_ID=se-3697717
```

Then restart backend and test.

---

## 📊 **What Your Request Will Look Like**

```json
{
  "rate_options": {
    "carrier_ids": ["se-3697717"],  // ← YOUR CARRIER
    "service_codes": null,
    "calculate_tax_amount": false
  },
  "shipment": {
    "validate_address": "validate_and_clean",
    "ship_from": {
      "name": "Mayhem Creations",
      "address_line1": "128 Persimmon Dr",
      "city_locality": "Newark",
      "state_province": "OH",
      "postal_code": "43055",
      "country_code": "US",
      "address_residential_indicator": "no"
    },
    "ship_to": {
      "name": "John Doe",
      "phone": "+15105551234",
      "address_line1": "1600 Amphitheatre Parkway",
      "city_locality": "Mountain View",
      "state_province": "CA",
      "postal_code": "94043",
      "country_code": "US",
      "address_residential_indicator": "yes"
    },
    "packages": [{
      "package_code": "package",
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
    }],
    "confirmation": "none"
  }
}
```

---

## 📋 **Terminal Logs You'll See**

### **If API Fetch Works:**

```
info: Retrieved carrier IDs from ShipEngine {
  carrierCount: 1,
  carriers: ['Stamps.com']
}

info: ShipEngine API Request: {
  ...
  rate_options: {
    carrier_ids: ['se-3697717']  // From API or fallback
  }
}
```

### **If API Fetch Fails:**

```
error: Failed to fetch carriers: {error details}
warn: Falling back to test carrier ID: se-3697717

info: ShipEngine API Request: {
  ...
  rate_options: {
    carrier_ids: ['se-3697717']  // Hardcoded fallback
  }
}
```

### **If No Carriers in Dashboard:**

```
info: Retrieved carrier IDs from ShipEngine {
  carrierCount: 0,
  carriers: []
}
warn: No carriers returned from API, using test carrier ID: se-3697717

info: ShipEngine API Request: {
  ...
  rate_options: {
    carrier_ids: ['se-3697717']  // Hardcoded fallback
  }
}
```

---

## 🎯 **Benefits of This Approach**

### **1. Automatic Fallback**
- If carriers aren't configured in dashboard → Uses se-3697717
- If API key is invalid → Uses se-3697717
- If network fails → Uses se-3697717

### **2. Smart Detection**
- Tries to use real carriers first
- Falls back only when needed
- Logs every step for debugging

### **3. Easy Configuration**
- Change via environment variable
- No code changes needed
- Can override per environment

### **4. Testing Friendly**
- Always has a carrier to test with
- Won't fail with "no carriers" error
- Can test rates immediately

---

## 🔍 **Troubleshooting**

### **Problem: Still getting fallback rates**

**Check these in order:**

1. **API Key:**
   ```bash
   # In backend/.env
   SHIPSTATION_API_KEY=your_actual_key_here
   ```

2. **Carrier ID is correct:**
   ```bash
   # Terminal should show:
   warn: Using test carrier ID: se-3697717
   # OR
   info: Retrieved carrier IDs from ShipEngine
   ```

3. **Carrier exists in your account:**
   - Log into ShipEngine dashboard
   - Verify carrier `se-3697717` exists
   - Make sure it's active and configured

4. **Check API response:**
   ```bash
   # Terminal will show detailed error
   error: Error fetching shipping rates from ShipEngine: {
     responseData: "..." // Error details here
   }
   ```

---

## 🎨 **Example Scenarios**

### **Scenario 1: Testing Without Dashboard Setup**

```
User has API key but no carriers in dashboard

✅ Code tries to fetch carriers
✅ Gets empty array
✅ Falls back to se-3697717
✅ Makes rate request with se-3697717
✅ Gets rates (if carrier exists in account)
```

### **Scenario 2: Production with Multiple Carriers**

```
User has multiple carriers configured

✅ Code fetches all carriers
✅ Gets [se-3697717, se-1111111, se-2222222]
✅ Uses all carriers for rate request
✅ Returns rates from all carriers
```

### **Scenario 3: API Key Issue**

```
User's API key is invalid

✅ Code tries to fetch carriers
❌ Gets 401 Unauthorized
✅ Falls back to se-3697717
✅ Makes rate request with se-3697717
❌ Still fails (because API key is invalid)
✅ Returns clear error message
```

---

## 📖 **Quick Reference**

### **Where Carrier ID is Used:**

```
File: backend/src/services/shipEngineService.ts
Line: 195-223

Default Value: 'se-3697717'
Environment Variable: SHIPENGINE_TEST_CARRIER_ID
```

### **How to Change It:**

**Option 1: Environment Variable**
```env
# backend/.env
SHIPENGINE_TEST_CARRIER_ID=se-YOUR-CARRIER-ID
```

**Option 2: Code (Not Recommended)**
```typescript
// Line 195 in shipEngineService.ts
const testCarrierId = process.env.SHIPENGINE_TEST_CARRIER_ID || 'se-YOUR-ID';
```

### **How to Test:**

```bash
1. Add API key to backend/.env
2. Restart backend server
3. Go to Admin → Shipping
4. Click "Calculate Shipping Rates"
5. Check terminal logs for carrier ID used
```

---

## ✅ **Summary**

**Question:** How do I use carrier `se-3697717`?

**Answer:** ✅ **It's already configured!**

- Hardcoded as default fallback
- Will be used automatically if no carriers found
- Can be overridden via environment variable
- Works with or without carrier dashboard setup

**Just add your API key and test!** 🚀

---

## 📞 **Next Steps**

1. ✅ **Carrier ID configured** - se-3697717
2. ⏳ **Add API key** - to `backend/.env`
3. ⏳ **Restart backend** - to load changes
4. ⏳ **Test rates** - Should now work!

**Check terminal logs to see carrier ID being used!**

