# ✅ Carrier/Service Code Mismatch - FIXED

## ❌ Previous Error

```
error_code: 'unspecified'
message: 'invalid service_code for the requested carrier_id 3697717'
```

**Problem:** The code was hardcoding `carrier_id: se-3697717` but using a `service_code` that doesn't match that specific carrier.

---

## 🔍 Root Cause

The label creation was **ignoring the shipping method chosen during checkout** and instead:
- ❌ Hardcoding carrier ID: `se-3697717`
- ❌ Using a generic service code: `usps_priority_mail`
- ❌ These two didn't match, causing ShipEngine to reject the request

---

## ✅ Solution

Now the code **uses the carrier and service information from the order's checkout**:

### **Priority Order:**
1. **First:** Use `shipping_method` from order table (saved during checkout)
2. **Second:** Use `selectedShipping` from order_data
3. **Third:** Use environment variable `SHIPENGINE_CARRIER_ID`
4. **Fallback:** Error if no carrier/service found

---

## 🔧 What Was Changed

### **Before (Hardcoded):**
```typescript
shipment: {
  carrier_id: 'se-3697717',  // ❌ Always this carrier
  service_code: 'usps_priority_mail',  // ❌ Generic service
  // ...
}
```

### **After (Dynamic from Checkout):**
```typescript
// Get shipping method from order
let shippingMethod = order.shipping_method
if (typeof shippingMethod === 'string') {
  shippingMethod = JSON.parse(shippingMethod)
}

// Build shipment config
const shipmentConfig = {
  ship_from: { /* warehouse */ },
  ship_to: { /* customer */ },
  packages: [ /* ... */ ]
}

// Add carrier from order's shipping method
if (shippingMethod?.carrierId) {
  shipmentConfig.carrier_id = shippingMethod.carrierId  // ✅ From checkout
}

// Add service code from order's shipping method
if (shippingMethod?.serviceCode) {
  shipmentConfig.service_code = shippingMethod.serviceCode  // ✅ From checkout
}
```

---

## 📊 Debug Output

Now when creating a label, you'll see:

```
📦 Extracted data: {
  itemsCount: 3,
  hasShippingAddress: true,
  hasShippingMethod: true,
  shippingMethod: {
    carrierId: 'se-123456',
    serviceCode: 'usps_priority_mail',
    serviceName: 'USPS Priority Mail',
    cost: 12.50,
    estimatedDeliveryDays: 3
  }
}
📮 Using carrier from order: se-123456
📮 Using service code from order: usps_priority_mail
🚚 Final shipment config: {
  carrier_id: 'se-123456',
  service_code: 'usps_priority_mail',
  from: 'Austin, TX',
  to: 'San Jose, CA'
}
✅ Label created successfully!
```

---

## 🎯 How It Works Now

### **Step 1: Customer Selects Shipping During Checkout**
```typescript
// In OrderCheckout.tsx
const selectedShipping = {
  carrierId: 'se-123456',
  serviceCode: 'usps_priority_mail',
  serviceName: 'USPS Priority Mail',
  cost: 12.50
}
```

### **Step 2: Saved to Database**
```sql
-- order_reviews table
shipping_method = '{
  "carrierId": "se-123456",
  "serviceCode": "usps_priority_mail",
  "serviceName": "USPS Priority Mail",
  "cost": 12.50
}'
```

### **Step 3: Used for Label Creation**
```typescript
// In shipEngineLabelService.ts
const shippingMethod = JSON.parse(order.shipping_method)
shipmentConfig.carrier_id = shippingMethod.carrierId      // ✅ Matches
shipmentConfig.service_code = shippingMethod.serviceCode  // ✅ Matches
```

### **Step 4: ShipEngine Accepts It**
```
✅ Valid combination → Label created!
```

---

## 🔑 Supported Field Names

The code now checks multiple possible field names for compatibility:

### **For Carrier ID:**
- `shippingMethod.carrierId`
- `shippingMethod.carrier_id`
- `shippingMethod.carrierId`

### **For Service Code:**
- `shippingMethod.serviceCode`
- `shippingMethod.service_code`
- `orderData.selectedShipping.service_code`

---

## ⚠️ Important: Ensure Checkout Saves Shipping Method

For this to work, your **checkout process must save** the shipping method to the database:

### **In OrderCheckout.tsx (or similar):**

```typescript
// When saving order after payment
const orderData = {
  items: cartItems,
  shippingAddress: shippingAddress,
  // ... other data
}

// Save shipping method separately in order_reviews table
await db.query(
  `UPDATE order_reviews 
   SET shipping_method = ? 
   WHERE id = ?`,
  [JSON.stringify({
    carrierId: selectedRate.carrierId,
    serviceCode: selectedRate.serviceCode,
    serviceName: selectedRate.serviceName,
    cost: selectedRate.cost,
    estimatedDeliveryDays: selectedRate.estimatedDeliveryDays
  }), orderId]
)
```

---

## 🧪 Testing

### **Test 1: Check Order Has Shipping Method**

```sql
-- Run in database
SELECT 
  id, 
  order_number, 
  shipping_method 
FROM order_reviews 
WHERE id = 2;
```

**Expected:**
```json
{
  "carrierId": "se-123456",
  "serviceCode": "usps_priority_mail",
  "serviceName": "USPS Priority Mail",
  "cost": 12.50
}
```

### **Test 2: Create Label**

1. Admin Panel → Orders → View Details
2. Click **"Create Label"**
3. Check backend console for debug logs
4. Should see: "📮 Using carrier from order: se-123456"

---

## ✅ Success Indicators

You'll know it's working when you see:

1. ✅ `📮 Using carrier from order: se-XXXXXX`
2. ✅ `📮 Using service code from order: usps_priority_mail`
3. ✅ `🚚 Final shipment config:` shows matching carrier and service
4. ✅ `✅ Label created successfully: se-XXXXXXXXX`
5. ✅ No more "invalid service_code for carrier" errors!

---

## 🆘 Troubleshooting

### **If you still get "invalid service_code":**

**Check 1:** Is `shipping_method` saved in the database?
```sql
SELECT shipping_method FROM order_reviews WHERE id = 2;
```

**Check 2:** Does it have `carrierId` and `serviceCode`?
```
Should see: {"carrierId":"se-123456","serviceCode":"usps_priority_mail"}
```

**Check 3:** Are they matching pair?
- Each carrier supports specific services
- USPS carriers only support USPS services
- UPS carriers only support UPS services
- etc.

---

## 📝 Summary

**Before:** ❌ Hardcoded carrier and service that didn't match

**After:** ✅ Uses the **exact carrier and service the customer selected during checkout**

**Result:** Labels create successfully with the shipping method the customer paid for! 🎉

---

**The mismatch error should now be completely resolved!**

