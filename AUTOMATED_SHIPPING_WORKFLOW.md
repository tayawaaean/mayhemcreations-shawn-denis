# Automated Shipping Workflow - Complete Guide

## Overview

This guide explains the **recommended automated shipping workflow** for your ecommerce platform, including when to calculate rates, who sets pricing, and how to integrate label creation.

## 🎯 Recommended Workflow (Fully Automated)

### The Best Approach: **Customer-Selected at Checkout**

**Why this is best:**
- ✅ Customer sees **real-time accurate rates**
- ✅ Customer **chooses** their preferred shipping speed
- ✅ No manual pricing needed from admin
- ✅ Transparent pricing = happier customers
- ✅ Admin just creates label (one-click)

---

## 📋 Complete Workflow Steps

### Step 1: Customer Checkout (Frontend - Automated)

**When:** Customer reaches checkout after customization approval

**What Happens:**
```
1. Customer enters shipping address
   ↓
2. Frontend calls: POST /api/v1/shipping/shipengine/rates
   ↓
3. System shows 3-5 shipping options with prices:
   - USPS Priority Mail: $9.99 (3 days)
   - UPS Ground: $12.50 (5 days)
   - FedEx Express: $24.99 (2 days)
   ↓
4. Customer selects preferred option
   ↓
5. Shipping cost added to order total
```

**Code Example:**
```typescript
// In your checkout component
const handleAddressComplete = async () => {
  // Calculate shipping rates
  const response = await ShipEngineApiService.calculateRates(
    shippingAddress,
    cartItems
  );
  
  if (response.success) {
    // Show options to customer
    setShippingOptions(response.data.rates);
    setRecommendedOption(response.data.recommendedRate);
  }
};

const handleShippingSelection = (selectedRate) => {
  // Save selected rate
  setShippingMethod(selectedRate);
  
  // Update order total
  setOrderTotal(subtotal + selectedRate.totalCost + tax);
};
```

### Step 2: Order Creation (Backend - Automated)

**When:** Customer completes payment

**What Gets Saved:**
```typescript
// In order_reviews table
{
  shipping_address: JSON.stringify(address),
  shipping_method: JSON.stringify({
    serviceName: "USPS Priority Mail",
    serviceCode: "usps_priority_mail",
    carrierCode: "stamps_com",
    cost: 9.99,
    estimatedDeliveryDays: 3
  }),
  shipping_cost: 9.99,
  status: 'pending',
  payment_status: 'completed'
}
```

**Key Point:** The shipping method is **locked in** at checkout!

### Step 3: Admin Review/Approval (Admin Panel - Manual)

**When:** Admin reviews customization

**What Admin Does:**
- Review customer's design/customization
- Approve or request changes
- Move to "ready-for-production"

**What Admin Does NOT Do:**
- ❌ Calculate shipping rates (already done)
- ❌ Set shipping prices (customer already chose)
- ❌ Enter shipping details (already saved)

### Step 4: Production (Manual)

**When:** Order approved

**What Happens:**
- Admin/team produces the items
- Status: `in-production`
- Then: `ready-for-checkout` (ready to ship)

### Step 5: Label Creation (Admin - One Click!)

**When:** Order ready to ship

**What Happens:**
```
1. Admin clicks "Create Shipping Label" button
   ↓
2. System uses saved shipping method
   ↓
3. API creates label via ShipEngine
   ↓
4. Label PDF downloaded automatically
   ↓
5. Tracking number saved to order
   ↓
6. Customer gets email with tracking
   ↓
7. Status changes to 'shipped'
```

**API Call:**
```typescript
POST /api/v1/shipments/create-label
{
  "orderId": 123,
  // That's it! Uses saved shipping method
}
```

### Step 6: Tracking Updates (Automatic)

**What Happens:**
- Customer can track package via tracking link
- Admin can view tracking in order management
- Delivery confirmation updates order status

---

## 💰 Pricing Strategy Recommendations

### Option 1: Pass-Through Pricing (Recommended)

**Customer pays exact carrier rate**

**Pros:**
- ✅ Transparent and fair
- ✅ No markup needed
- ✅ Customers trust the pricing
- ✅ Automatic updates with carrier rate changes

**Cons:**
- ❌ No profit margin on shipping

**Implementation:**
```typescript
// Show exact rates from ShipEngine
displayRate = rate.totalCost; // e.g., $9.99
```

### Option 2: Flat Rate Shipping

**Customer pays fixed price regardless of location**

**Example:**
- Standard Shipping: $9.99 (all orders)
- Express Shipping: $24.99 (all orders)

**Pros:**
- ✅ Simple for customers
- ✅ Easy to communicate
- ✅ Predictable costs

**Cons:**
- ❌ May lose money on distant orders
- ❌ May overcharge local customers

**Implementation:**
```typescript
const shippingOptions = [
  { name: 'Standard', price: 9.99, days: '3-5' },
  { name: 'Express', price: 24.99, days: '1-2' }
];
```

### Option 3: Markup Pricing

**Add percentage to carrier rates**

**Example:**
- Carrier rate: $9.99
- Add 20% markup
- Customer pays: $11.99

**Pros:**
- ✅ Revenue from shipping
- ✅ Covers packaging costs
- ✅ Still competitive

**Cons:**
- ❌ May seem expensive
- ❌ Less transparent

**Implementation:**
```typescript
const SHIPPING_MARKUP = 1.20; // 20% markup
displayRate = rate.totalCost * SHIPPING_MARKUP;
```

### Option 4: Free Shipping Threshold

**Free shipping over certain amount**

**Example:**
- Orders < $50: Real shipping rates
- Orders ≥ $50: FREE shipping

**Pros:**
- ✅ Increases average order value
- ✅ Competitive advantage
- ✅ Marketing benefit

**Cons:**
- ❌ Absorb shipping costs
- ❌ May reduce profit margins

**Implementation:**
```typescript
const FREE_SHIPPING_THRESHOLD = 50.00;

if (orderSubtotal >= FREE_SHIPPING_THRESHOLD) {
  shipping = 0;
  message = 'FREE SHIPPING!';
} else {
  shipping = selectedRate.totalCost;
}
```

---

## 🏆 **Recommended: Option 1 (Pass-Through) + Option 4 (Free Threshold)**

**Best of both worlds:**
```typescript
if (orderSubtotal >= 50) {
  shipping = 0;
  message = '🎉 You qualify for FREE SHIPPING!';
} else {
  // Show real-time rates
  const rates = await calculateRates(address, items);
  shipping = customerSelectedRate.totalCost;
  message = `$${(50 - orderSubtotal).toFixed(2)} away from FREE shipping!`;
}
```

---

## 🔧 Implementation Guide

### Frontend Integration (Checkout)

**File:** `frontend/src/ecommerce/routes/OrderCheckout.tsx`

```typescript
import { ShipEngineApiService } from '@/shared/shipEngineApiService';

const OrderCheckout = () => {
  const [shippingRates, setShippingRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [calculatingRates, setCalculatingRates] = useState(false);

  // Calculate rates when address is complete
  const calculateShipping = async (address) => {
    setCalculatingRates(true);
    try {
      const response = await ShipEngineApiService.calculateRates(
        address,
        cartItems
      );
      
      if (response.success) {
        setShippingRates(response.data.rates);
        // Auto-select recommended rate
        setSelectedRate(response.data.recommendedRate);
      }
    } catch (error) {
      console.error('Shipping calculation error:', error);
    } finally {
      setCalculatingRates(false);
    }
  };

  // When customer proceeds to payment
  const handleCheckout = () => {
    const orderData = {
      items: cartItems,
      shippingAddress,
      shippingMethod: selectedRate, // Save selected method!
      shippingCost: selectedRate.totalCost,
      subtotal,
      tax,
      total: subtotal + selectedRate.totalCost + tax
    };
    
    // Continue to payment...
  };

  return (
    // ... your checkout UI
    <div>
      {/* Shipping Options */}
      {shippingRates.map(rate => (
        <div
          key={rate.serviceCode}
          onClick={() => setSelectedRate(rate)}
          className={selectedRate === rate ? 'selected' : ''}
        >
          <span>{rate.serviceName}</span>
          <span>${rate.totalCost.toFixed(2)}</span>
          <span>{rate.estimatedDeliveryDays} days</span>
        </div>
      ))}
    </div>
  );
};
```

### Admin Integration (Order Management)

**Add "Create Label" button to admin order view:**

```typescript
// In admin order details
const handleCreateLabel = async (orderId) => {
  try {
    const response = await fetch('/api/v1/shipments/create-label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();
    
    if (data.success) {
      // Download label PDF
      window.open(data.data.labelDownload.pdf, '_blank');
      
      // Update UI with tracking number
      setTrackingNumber(data.data.trackingNumber);
      
      alert('Label created successfully!');
    }
  } catch (error) {
    alert('Failed to create label');
  }
};
```

---

## 📊 Database Schema Updates

### Add to `order_reviews` table:

```sql
-- Shipping method selected by customer
ALTER TABLE order_reviews ADD COLUMN shipping_method JSON;

-- Shipping cost
ALTER TABLE order_reviews ADD COLUMN shipping_cost DECIMAL(10, 2);

-- Label URL
ALTER TABLE order_reviews ADD COLUMN label_url TEXT;

-- Tracking details
ALTER TABLE order_reviews ADD COLUMN tracking_number VARCHAR(100);
ALTER TABLE order_reviews ADD COLUMN tracking_url TEXT;
ALTER TABLE order_reviews ADD COLUMN shipping_carrier VARCHAR(50);

-- Shipment dates
ALTER TABLE order_reviews ADD COLUMN shipped_at TIMESTAMP;
ALTER TABLE order_reviews ADD COLUMN delivered_at TIMESTAMP;
```

---

## 🎯 Decision Tree: Who Sets What?

```
SHIPPING RATES
├─ Customer sees: Real-time carrier rates ✅
├─ Customer selects: Preferred shipping method ✅
├─ System saves: Selected method + cost ✅
└─ Admin does: NOTHING (already set) ✅

SHIPPING LABELS
├─ Admin triggers: "Create Label" button ✅
├─ System uses: Saved shipping method ✅
├─ ShipEngine creates: Label + tracking ✅
└─ Customer gets: Tracking notification ✅

PRICING STRATEGY
├─ You choose: Pass-through, flat rate, or markup
├─ Implement once: In frontend rate calculation
└─ Applies to all: Orders automatically
```

---

## ✅ Advantages of This Workflow

1. **Transparency:** Customer knows exact shipping cost upfront
2. **Choice:** Customer selects speed vs. cost preference
3. **Automation:** Admin doesn't calculate or price anything
4. **Accuracy:** Real-time rates prevent overcharging/undercharging
5. **Simplicity:** Admin just clicks "Create Label"
6. **Trust:** Customers see actual carrier rates
7. **Scalability:** Works for 10 orders or 10,000 orders

---

## 🚀 Implementation Checklist

### Phase 1: Frontend (Checkout)
- [ ] Add ShipEngine rate calculation to checkout
- [ ] Display shipping options to customer
- [ ] Let customer select preferred method
- [ ] Save selected method with order
- [ ] Include shipping cost in order total

### Phase 2: Backend (Order Processing)
- [ ] Save shipping method to database
- [ ] Include shipping in order confirmation email
- [ ] Display shipping method in admin order view

### Phase 3: Admin (Label Creation)
- [ ] Add "Create Label" button to order management
- [ ] Implement label creation API call
- [ ] Download/display label PDF
- [ ] Save tracking number
- [ ] Update order status to "shipped"

### Phase 4: Customer Communication
- [ ] Send shipping confirmation email with tracking
- [ ] Show tracking info in customer order history
- [ ] Provide tracking link

---

## 📱 Admin UI Recommendation

**Add to Order Management Page:**

```
Order #ORD-12345

[... order details ...]

Shipping Information:
├─ Address: 123 Main St, Los Angeles, CA 90001
├─ Method: USPS Priority Mail (3 days)
├─ Cost: $9.99
└─ Status: Ready to ship

[Create Shipping Label] ← One-click button

After label created:
├─ Label: [Download PDF]
├─ Tracking: 9400111899562537868616
└─ Track: [View Tracking]
```

---

## 💡 Summary

**Customer Experience:**
1. See real prices at checkout ✅
2. Choose shipping speed ✅
3. Pay total with shipping ✅
4. Receive tracking automatically ✅

**Admin Experience:**
1. Review order (customization) ✅
2. Produce items ✅
3. Click "Create Label" ✅
4. Print and ship ✅

**Your Workflow:**
- **AUTOMATED:** Rate calculation, pricing, method selection
- **MANUAL:** Order approval, production, label creation
- **RESULT:** Fast, efficient, scalable! 🚀

---

## 🎓 Next Steps

1. Test shipping rate calculator in admin panel
2. Integrate into checkout flow
3. Add "Create Label" button to order management
4. Test full workflow end-to-end
5. Deploy and monitor

**Questions to decide:**
- Pass-through or markup pricing?
- Free shipping threshold?
- Which carriers to enable?
- Test vs. production labels first?

---

**Ready to implement?** Follow the implementation checklist above!

**Need help?** Check the test page: Admin → Shipping Management

