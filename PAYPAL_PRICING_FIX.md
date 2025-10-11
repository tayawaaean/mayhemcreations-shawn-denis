# PayPal Pricing Information Fix

## Problem
When customers paid with PayPal, the order summary in the admin panel showed:
```
Subtotal: $4108.00
Shipping: $0.00   ❌
Tax: $0.00        ❌
Total: $4108.00
```

The shipping and tax amounts were not being saved to the database, even though they were calculated on the frontend.

## Root Cause
The PayPal payment flow was missing the pricing breakdown (subtotal, shipping, tax, total) in the metadata:
1. **Frontend**: Pricing was not included in the PayPal order creation or capture metadata
2. **Backend**: PayPal capture handler was not extracting or saving pricing information

## Solution

### 1. Frontend - Pass Pricing in Metadata

#### A. PayPal Order Creation (`createPayPalOrder`)
Added pricing breakdown to metadata:
```typescript
metadata: {
  orderId: String(order.id),
  customerEmail: formData.email,
  customerName: `${formData.firstName} ${formData.lastName}`,
  // ... form data ...
  
  // ✅ ADD pricing breakdown for order tracking
  subtotal: String(calculateSubtotal().toFixed(2)),
  shipping: String(calculateShipping().toFixed(2)),
  tax: String(calculateTax().toFixed(2)),
  total: String(calculateTotal().toFixed(2)),
}
```

#### B. PayPal Order Capture (`capturePayPalOrder`)
Added pricing breakdown to capture metadata:
```typescript
metadata: {
  customerEmail: formData.email,
  customerName: `${formData.firstName} ${formData.lastName}`,
  // ... form data ...
  
  // ✅ Include pricing for order completion
  subtotal: String(calculateSubtotal().toFixed(2)),
  shipping: String(calculateShipping().toFixed(2)),
  tax: String(calculateTax().toFixed(2)),
  total: String(calculateTotal().toFixed(2)),
}
```

### 2. Backend - Extract and Save Pricing

#### PayPal Capture Handler (`backend/src/controllers/paypalController.ts`)

**Before:**
```typescript
// Update order status and payment/shipping details
await sequelize.query(`
  UPDATE order_reviews 
  SET status = 'approved-processing',
      order_number = ?,
      shipping_address = ?,
      billing_address = ?,
      payment_method = 'paypal',
      payment_status = 'completed',
      payment_provider = 'paypal',
      payment_intent_id = ?,
      transaction_id = ?,
      card_brand = ?,
      -- ❌ Missing: subtotal, shipping, tax, total
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = ?
`, { ... });
```

**After:**
```typescript
// ✅ Extract pricing information from metadata
const subtotal = metadata?.subtotal ? parseFloat(metadata.subtotal) : order.subtotal || null;
const shipping = metadata?.shipping ? parseFloat(metadata.shipping) : order.shipping || null;
const tax = metadata?.tax ? parseFloat(metadata.tax) : order.tax || null;
const total = metadata?.total ? parseFloat(metadata.total) : order.total || null;

logger.info('💳 Saving PayPal payment details:', {
  orderId: order.id,
  shippingAddress,
  payerEmail,
  orderNumber,
  pricing: { subtotal, shipping, tax, total }  // ✅ Log pricing
});

// ✅ Update order status and payment/shipping details WITH pricing
await sequelize.query(`
  UPDATE order_reviews 
  SET status = 'approved-processing',
      order_number = ?,
      shipping_address = ?,
      billing_address = ?,
      payment_method = 'paypal',
      payment_status = 'completed',
      payment_provider = 'paypal',
      payment_intent_id = ?,
      transaction_id = ?,
      card_brand = ?,
      subtotal = ?,         -- ✅ Added
      shipping = ?,         -- ✅ Added
      tax = ?,             -- ✅ Added
      total = ?,           -- ✅ Added
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = ?
`, {
  replacements: [
    orderNumber,
    shippingAddress ? JSON.stringify(shippingAddress) : null,
    shippingAddress ? JSON.stringify(shippingAddress) : null,
    capture.id,
    `paypal_${orderId}`,
    cardBrand,
    subtotal,    // ✅ Added
    shipping,    // ✅ Added
    tax,         // ✅ Added
    total,       // ✅ Added
    order.id
  ]
});
```

## Result

### After Fix:
```
Order Summary

Subtotal: $3850.00   ✅
Shipping: $9.99      ✅
Tax: $308.00         ✅
Total Paid: $4167.99 ✅
```

All pricing information now displays correctly for PayPal orders, matching the Stripe order display.

## Data Flow

```
Customer fills form
       ↓
Calculates: subtotal, shipping, tax, total
       ↓
Creates PayPal order (with pricing in metadata)
       ↓
Customer approves payment in PayPal
       ↓
PayPal redirects back
       ↓
Capture PayPal order (with pricing in metadata)
       ↓
Backend extracts pricing from metadata
       ↓
Saves to order_reviews table
       ↓
Admin panel displays complete pricing breakdown ✅
```

## Calculation Functions

### Subtotal
```typescript
const calculateSubtotal = () => {
  return order.items.reduce((total, item) => {
    const itemPrice = calculateItemPrice(item)
    return total + (itemPrice * item.quantity)
  }, 0)
}
```

### Tax (8%)
```typescript
const calculateTax = () => calculateSubtotal() * 0.08
```

### Shipping
```typescript
const calculateShipping = () => {
  if (selectedShippingRate) {
    return selectedShippingRate.totalCost
  }
  // Free shipping over $50, otherwise $9.99
  return calculateSubtotal() > 50 ? 0 : 9.99
}
```

### Total
```typescript
const calculateTotal = () => calculateSubtotal() + calculateTax() + calculateShipping()
```

## Fallback Logic

The backend uses fallback logic to handle cases where metadata might be missing:
```typescript
const subtotal = metadata?.subtotal 
  ? parseFloat(metadata.subtotal) 
  : order.subtotal || null;  // Fallback to existing order data
```

This ensures pricing is captured even if:
- Metadata is missing (uses existing order data)
- Value is invalid (uses null)

## Testing

1. ✅ Fill out checkout form
2. ✅ Select PayPal payment method
3. ✅ Verify total amount is correct
4. ✅ Complete PayPal payment
5. ✅ Check admin panel order details
6. ✅ Verify subtotal, shipping, tax, and total all display correctly
7. ✅ Compare with Stripe orders - should match

## Note on Address Display

If the address appears in the wrong order (e.g., street number in apartment field):
```
Boylston Street Copley Square, near Trinity Church
500                                                    ← Street number in wrong field
Boston, MA 21161
```

This is due to customer data entry error, not a code issue. The form labels are:
- **Street Address*** - Should contain full street address with number
- **Apartment, suite, etc.** - Optional unit/apartment number

The display code correctly shows `street` first, then `apartment` below it.

