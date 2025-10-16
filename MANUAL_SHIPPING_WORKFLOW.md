# 📦 Manual Shipping Workflow Guide

## ✅ Changes Made

Your shipping workflow has been updated to give you **full manual control** over when orders are marked as "shipped".

### **What Changed:**

**Before (Automatic):**
1. Create label → Order status automatically changes to "shipped"
2. No control over when the status updates
3. Customer would see "shipped" even if package not handed to carrier yet

**After (Manual Control):**
1. Create label → Tracking info saved, order status **stays the same**
2. Admin manually updates status to "shipped" when ready
3. Customer only sees "shipped" when package is actually with the carrier

---

## 🔄 New Shipping Workflow

### **Step 1: Create Shipping Label** 📋
**Location:** Admin Panel → Pending Review → Order Details

**What Happens:**
- Click "Create Label" or "Update Label"
- ShipEngine generates shipping label
- System saves:
  - ✅ Tracking number
  - ✅ Carrier code (USPS, UPS, FedEx)
  - ✅ Service code (Priority Mail, Ground, etc.)
  - ✅ Label PDF URL
- ❌ Order status **DOES NOT** change
- ❌ Customer **DOES NOT** receive notification yet

**Result:** Label is ready to print, but order is not marked as shipped yet.

---

### **Step 2: Package the Order** 📦
**Your Actions:**
1. Download and print the shipping label
2. Package the items carefully
3. Affix the label to the package
4. Prepare package for carrier pickup/drop-off

**Order Status:** Still showing previous status (e.g., "ready-for-production")

---

### **Step 3: Hand Package to Carrier** 🚚
**Your Actions:**
1. Drop off package at carrier location (USPS, UPS, FedEx)
2. OR hand package to carrier driver during pickup
3. Get receipt/scan confirmation from carrier

**Order Status:** Still not updated yet - you control this

---

### **Step 4: Manually Mark as Shipped** ✅
**Location:** Admin Panel → Pending Review → Order Details → Update Status

**Your Actions:**
1. Click "Update Status" button
2. Change status dropdown to **"shipped"**
3. (Optional) Add admin notes: "Handed to USPS carrier on [date]"
4. Click "Update Status"

**What Happens Automatically:**
- ✅ Order status changes to "shipped"
- ✅ `shipped_at` timestamp is set to NOW()
- ✅ Uses existing tracking info from label creation
- ✅ Customer can now see tracking information
- ✅ (Future) Customer receives email notification

**Result:** Customer knows package is on its way!

---

## 📋 Admin Panel Features

### **Status Update Modal**

When you click "Update Status", you'll see:

```
┌─────────────────────────────────────┐
│  Update Order Status                │
├─────────────────────────────────────┤
│  Current Status: ready-for-production│
│                                     │
│  New Status: [shipped ▼]           │
│                                     │
│  Admin Notes: (optional)            │
│  ┌─────────────────────────────┐  │
│  │ Package handed to USPS      │  │
│  │ carrier on 10/16/2025       │  │
│  └─────────────────────────────┘  │
│                                     │
│  Tracking Number: (auto-filled)     │
│  9400111899562984736281             │
│                                     │
│  Shipping Carrier: (auto-filled)    │
│  USPS                              │
│                                     │
│  [Cancel]  [Update Status]         │
└─────────────────────────────────────┘
```

**Notes:**
- Tracking info is **auto-filled** from label creation
- You can override it if needed (for manual shipping)
- Admin notes are optional but recommended

---

### **Validation Rules**

**When changing status to "shipped":**

✅ **If label was created:**
- Tracking number already exists
- Carrier already exists
- You can click "Update Status" immediately
- No additional info required

❌ **If NO label was created:**
- Must manually enter tracking number
- Must manually enter carrier
- System will show error if missing

---

## 🎯 Complete Workflow Example

### **Scenario: Customer Orders Custom Embroidered Cap**

**Day 1 - Production:**
```
Status: approved-processing → ready-for-production
Admin: Designs approved, starting production
```

**Day 2 - Label Creation:**
```
Admin Action: Click "Create Label"
Result: 
  - Label PDF created
  - Tracking: 9400111899562984736281
  - Carrier: USPS Priority Mail
  - Status: STILL "ready-for-production"
  - Customer: Cannot see tracking yet
```

**Day 2 - Packaging:**
```
Admin Action: 
  - Print label
  - Package embroidered cap
  - Affix label to box
Status: STILL "ready-for-production"
Customer: Cannot see tracking yet
```

**Day 3 - Drop-off at Post Office:**
```
Admin Action:
  - Drop package at USPS
  - Get receipt scan
  - Return to office
Status: STILL "ready-for-production"
Customer: Cannot see tracking yet
```

**Day 3 - Manual Status Update:**
```
Admin Action:
  1. Open order in admin panel
  2. Click "Update Status"
  3. Select "shipped"
  4. Add note: "Dropped at USPS on 10/16/2025 at 2:30 PM"
  5. Click "Update Status"

Result:
  - Status changes to "shipped"
  - shipped_at set to current timestamp
  - Customer now sees tracking info
  - (Future) Customer receives email notification
```

**Day 7 - Delivery:**
```
Admin Action: 
  - Optionally update status to "delivered"
  - Or wait for customer confirmation
Customer: Receives package, can leave review
```

---

## 🔧 Database Fields Updated

### **When Creating Label:**
```sql
UPDATE order_reviews SET
  tracking_number = '9400111899562984736281',
  shipping_label_url = 'https://api.shipengine.com/...',
  carrier_code = 'usps',
  service_code = 'usps_priority_mail',
  updated_at = NOW()
WHERE id = 123;

-- Note: status and shipped_at are NOT changed
```

### **When Manually Marking as Shipped:**
```sql
UPDATE order_reviews SET
  status = 'shipped',
  shipped_at = NOW(),
  updated_at = NOW()
WHERE id = 123;

-- Note: tracking info already exists from label creation
-- COALESCE ensures existing values are preserved if not overridden
```

---

## 💡 Benefits of Manual Control

### **1. Accuracy**
- Customer only sees "shipped" when package is actually with carrier
- No confusion about package status
- Honest delivery timelines

### **2. Flexibility**
- Create labels in advance
- Package multiple orders before drop-off
- Update status in batch after carrier pickup

### **3. Quality Control**
- Final inspection before marking as shipped
- Catch any issues before customer sees tracking
- Add notes about specific shipment details

### **4. Better Customer Experience**
- Tracking info appears only when useful
- Reduces "where's my package?" inquiries
- More accurate delivery expectations

---

## 📊 Status Progression

```
Order Lifecycle:

pending
  ↓ (admin reviews design)
approved-processing
  ↓ (production starts)
ready-for-production
  ↓ (embroidery complete)
[CREATE LABEL] ← Label created, tracking saved
  ↓ (package and prepare)
[MANUAL UPDATE TO SHIPPED] ← You control this!
  ↓ (carrier has package)
shipped ← Customer sees tracking now
  ↓ (carrier delivers)
delivered
  ↓ (customer satisfied)
completed
```

---

## 🚨 Important Notes

### **Label Creation Does NOT:**
- ❌ Change order status
- ❌ Notify customer
- ❌ Set shipped_at timestamp
- ❌ Show tracking to customer

### **Label Creation DOES:**
- ✅ Generate shipping label PDF
- ✅ Save tracking number
- ✅ Save carrier/service info
- ✅ Make label ready to print

### **Manual Status Update to "Shipped" DOES:**
- ✅ Change order status to "shipped"
- ✅ Set shipped_at timestamp
- ✅ Make tracking visible to customer
- ✅ (Future) Send email notification

---

## 🔄 Edge Cases

### **What if I create label but never ship?**
**Solution:** Just don't update status to "shipped". The label info is saved but customer won't see it.

### **What if I need to create a new label?**
**Solution:** Click "Update Label" button. It will create new label and update tracking info.

### **What if I ship without creating a label?**
**Solution:** When you click "Update Status" → "shipped", manually enter tracking number and carrier.

### **What if customer asks about tracking before I mark as shipped?**
**Solution:** You can give them the tracking number manually, or update status to "shipped" when ready.

### **Can I revert status from "shipped" back?**
**Solution:** Yes, just use "Update Status" to change to a different status. The tracking info is preserved.

---

## 📝 Quick Reference

### **Create Label:**
1. Admin Panel → Pending Review
2. Click order → "Create Label"
3. Wait for label to generate
4. Download/Print label
5. Status: **No change**

### **Mark as Shipped:**
1. Admin Panel → Pending Review
2. Click order → "Update Status"
3. Select "shipped"
4. Add notes (optional)
5. Click "Update Status"
6. Customer: **Can now see tracking**

---

## 🎓 Best Practices

### **Daily Workflow:**
**Morning:**
1. Review orders ready for shipment
2. Create labels for all orders
3. Print all labels

**Afternoon:**
1. Package all orders
2. Prepare shipment batch
3. Drop at carrier location
4. Return to office

**Evening:**
1. Bulk update all orders to "shipped"
2. Add note: "Batch shipped on [date]"
3. Customers receive tracking info
4. (Future) Automated emails sent

### **Quality Checks:**
- ✅ Verify items match order before packaging
- ✅ Check label address matches order
- ✅ Get carrier scan receipt
- ✅ Update status same day as drop-off
- ✅ Add notes for special handling

---

## 📞 Support Scenarios

### **Customer: "Where's my tracking?"**

**If label created but not marked shipped:**
```
Response: "Your order is being packaged and will ship 
today/tomorrow. You'll receive tracking info via email 
once it's with the carrier."
```

**If marked as shipped:**
```
Response: "Your tracking number is [number]. You can 
track it at [carrier URL]. Allow 24 hours for tracking 
to appear in carrier system."
```

---

**Last Updated:** October 16, 2025  
**Workflow Type:** Manual (Admin-Controlled)  
**Automation Level:** Label creation automatic, status update manual

