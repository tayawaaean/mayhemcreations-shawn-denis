# Custom Embroidery Payment Integration Fix

## Problem
Stripe checkout and PayPal payments were failing when the cart contained custom embroidery items with `productId === 'custom-embroidery'`.

## Root Causes

### 1. Product Lookup Failure
- Both Stripe and PayPal checkout functions tried to find custom embroidery items in the product catalog using `findProductById('custom-embroidery')`
- This returned `null` because custom embroidery items don't exist in the product catalog
- While fallback values were in place, they didn't provide proper product names or descriptions

### 2. Pricing Calculation Issues
- The `getPricingBreakdown()` function didn't have special handling for custom embroidery items
- It was trying to calculate pricing using catalog lookups and standard pricing breakdown
- Custom embroidery pricing is stored in `item.customization.embroideryData` with different structure:
  - `materialCosts.totalCost` = base embroidery cost
  - `optionsPrice` = embroidery options cost

### 3. Missing Error Details
- Payment errors weren't providing detailed information about what was failing
- Made debugging difficult

## Solution

### File: `frontend/src/ecommerce/routes/Payment.tsx`

#### 1. Enhanced Stripe Checkout (Lines 390-430)
```typescript
// Build Stripe Checkout line items
const lineItems = orderData.items.map((item) => {
  // Handle custom embroidery items specially
  const isCustomEmbroidery = item.productId === 'custom-embroidery'
  const product = isCustomEmbroidery ? null : findProductById(item.productId)
  
  // Use getPricingBreakdown for accurate pricing
  const pricing = getPricingBreakdown(item)
  const itemPrice = pricing.totalPrice
  
  // Determine product name and description
  let productName = 'Custom Product'
  let productDescription = `Qty ${item.quantity}`
  
  if (isCustomEmbroidery && item.customization?.embroideryData) {
    productName = 'Custom Embroidery'
    const dimensions = item.customization.embroideryData.dimensions
    if (dimensions) {
      productDescription = `${dimensions.width}" × ${dimensions.height}" - Qty ${item.quantity}`
    }
  } else if (product) {
    productName = product.title
    if (item.customization) {
      productDescription = `Customized - Qty ${item.quantity}`
    }
  } else if (item.productName) {
    productName = item.productName
  }
  
  return {
    price_data: {
      currency: 'usd',
      product_data: {
        name: productName,
        description: productDescription,
        images: product?.image ? [product.image] : undefined,
      },
      unit_amount: Math.round(itemPrice * 100), // Stripe expects amount in cents
    },
    quantity: item.quantity,
  }
})
```

**Changes:**
- Explicitly check for `isCustomEmbroidery` before attempting product lookup
- Skip catalog lookup for custom embroidery items
- Create descriptive product name with dimensions for custom embroidery
- Use `getPricingBreakdown()` which now properly handles custom embroidery

#### 2. Enhanced PayPal Checkout (Lines 499-532)
```typescript
// Build PayPal order items
const items = orderData.items.map((item) => {
  // Handle custom embroidery items specially
  const isCustomEmbroidery = item.productId === 'custom-embroidery'
  const product = isCustomEmbroidery ? null : findProductById(item.productId)
  
  // Use getPricingBreakdown for accurate pricing
  const pricing = getPricingBreakdown(item)
  const itemPrice = pricing.totalPrice
  
  // Determine product name
  let productName = 'Custom Product'
  
  if (isCustomEmbroidery && item.customization?.embroideryData) {
    productName = 'Custom Embroidery'
    const dimensions = item.customization.embroideryData.dimensions
    if (dimensions) {
      productName = `Custom Embroidery (${dimensions.width}" × ${dimensions.height}")`
    }
  } else if (product) {
    productName = product.title
    if (item.customization) {
      productName = `${product.title} (Customized)`
    }
  } else if (item.productName) {
    productName = item.productName
  }
  
  return {
    name: productName,
    quantity: item.quantity,
    unitAmount: itemPrice,
    currency: 'usd'
  }
})
```

**Changes:**
- Same approach as Stripe: explicit check for custom embroidery
- Skip catalog lookup for custom embroidery
- Create descriptive product name with dimensions
- Use proper pricing from `getPricingBreakdown()`

#### 3. Fixed getPricingBreakdown Function (Lines 103-169)
```typescript
const getPricingBreakdown = (item: any): {
  baseProductPrice: number
  embroideryPrice: number
  embroideryOptionsPrice: number
  totalPrice: number
} => {
  // Special handling for custom embroidery items
  if (item.productId === 'custom-embroidery' && item.customization?.embroideryData) {
    const embroideryData = item.customization.embroideryData
    const baseEmbroideryPrice = Number(embroideryData.materialCosts?.totalCost) || 0
    const optionsPrice = Number(embroideryData.optionsPrice) || 0
    const totalPrice = baseEmbroideryPrice + optionsPrice
    
    return {
      baseProductPrice: baseEmbroideryPrice, // For custom embroidery, the base is the material cost
      embroideryPrice: 0, // No separate embroidery cost (it's the base)
      embroideryOptionsPrice: optionsPrice,
      totalPrice
    }
  }
  
  // ... rest of the function for regular products
}
```

**Changes:**
- Added special case at the beginning for custom embroidery items
- Extracts pricing from `embroideryData.materialCosts.totalCost` and `embroideryData.optionsPrice`
- Returns correct pricing structure without attempting catalog lookups

#### 4. Enhanced Error Logging (Lines 441, 480-491, 574-580)

**Stripe:**
```typescript
console.log('💳 Stripe lineItems being sent:', JSON.stringify(lineItems, null, 2))
// ... API call ...
console.log('💳 Stripe response:', response)

if (response.success && response.data?.url) {
  window.location.href = response.data.url
  return
}

console.error('❌ Stripe checkout failed:', response)
showError(response.message || 'Failed to create checkout session')
setIsProcessing(false)
} catch (error: any) {
  console.error('❌ Stripe payment error:', error)
  console.error('Error details:', {
    message: error?.message,
    response: error?.response?.data,
    stack: error?.stack
  })
  showError(error?.response?.data?.message || error?.message || 'Failed to process payment. Please try again.')
  setIsProcessing(false)
}
```

**PayPal:**
```typescript
console.log('📦 PayPal payload being sent:', {
  amount: paypalPayload.amount,
  shippingAddress: paypalPayload.shippingAddress,
  customerInfo: paypalPayload.customerInfo,
  itemsCount: paypalPayload.items.length,
  items: JSON.stringify(paypalPayload.items, null, 2)
})
```

**Changes:**
- Added detailed console logging for line items/payload being sent
- Added response logging
- Enhanced error logging with full error details
- Better error messages shown to users

## Testing Checklist

### Before Testing
1. Ensure backend is running
2. Ensure Stripe and PayPal credentials are configured
3. Have a test order with custom embroidery in cart

### Test Scenarios

#### Stripe Payment
1. ✅ Add custom embroidery item to cart
2. ✅ Proceed through checkout to payment page
3. ✅ Select Stripe payment method
4. ✅ Click "Proceed to Payment"
5. ✅ Verify console shows correct line items with:
   - Product name: "Custom Embroidery"
   - Description: includes dimensions (e.g., "5" × 5"")
   - Unit amount: correct price in cents
6. ✅ Should redirect to Stripe checkout page
7. ✅ Complete payment on Stripe
8. ✅ Should redirect back to success page

#### PayPal Payment
1. ✅ Add custom embroidery item to cart
2. ✅ Proceed through checkout to payment page
3. ✅ Select PayPal payment method
4. ✅ Click "Proceed to Payment"
5. ✅ Verify console shows correct items with:
   - Product name: "Custom Embroidery (5" × 5")"
   - Unit amount: correct price
6. ✅ Should redirect to PayPal approval page
7. ✅ Approve payment on PayPal
8. ✅ Should redirect back and capture payment

#### Mixed Cart
1. ✅ Add both custom embroidery and regular products
2. ✅ Test both Stripe and PayPal
3. ✅ Verify all items show with correct names and prices

## Browser Console Logs to Monitor

### Successful Stripe Checkout
```
💳 Starting Stripe checkout with address: {...}
💳 Stripe lineItems being sent: [
  {
    "price_data": {
      "currency": "usd",
      "product_data": {
        "name": "Custom Embroidery",
        "description": "5\" × 5\" - Qty 1"
      },
      "unit_amount": 16878
    },
    "quantity": 1
  }
]
💳 Stripe response: { success: true, data: { url: "..." } }
```

### Successful PayPal Order Creation
```
💳 Starting PayPal checkout with order data: {...}
📦 PayPal payload being sent: {
  amount: 168.78,
  items: [
    {
      "name": "Custom Embroidery (5\" × 5\")",
      "quantity": 1,
      "unitAmount": 168.78,
      "currency": "usd"
    }
  ]
}
📦 PayPal API response: { success: true, data: { approvalUrl: "..." } }
```

## Backend Considerations

No backend changes were required because:
- Backend controllers already accept item data as-is
- Validation checks only verify that items have name, quantity, and unit amount
- Custom embroidery items now provide all required fields from frontend
- Backend doesn't attempt to look up `productId === 'custom-embroidery'` in product catalog

## Related Files

- `frontend/src/ecommerce/routes/Payment.tsx` - Main payment page (Updated)
- `frontend/src/ecommerce/routes/Cart.tsx` - Already handles custom embroidery pricing correctly
- `frontend/src/ecommerce/routes/Checkout.tsx` - Already handles custom embroidery pricing correctly
- `backend/src/controllers/paypalController.ts` - No changes needed
- `backend/src/controllers/paymentController.ts` - No changes needed
- `backend/src/services/paypalService.ts` - Validation already supports custom items

## Prevention Guidelines

When adding new payment methods or modifying payment flows:

1. **Always check for custom embroidery items first:**
   ```typescript
   const isCustomEmbroidery = item.productId === 'custom-embroidery'
   ```

2. **Skip catalog lookups for custom embroidery:**
   ```typescript
   const product = isCustomEmbroidery ? null : findProductById(item.productId)
   ```

3. **Use embroideryData for pricing:**
   ```typescript
   if (isCustomEmbroidery && item.customization?.embroideryData) {
     const basePrice = embroideryData.materialCosts?.totalCost
     const optionsPrice = embroideryData.optionsPrice
     const totalPrice = basePrice + optionsPrice
   }
   ```

4. **Create descriptive product names:**
   ```typescript
   if (isCustomEmbroidery) {
     productName = `Custom Embroidery (${dimensions.width}" × ${dimensions.height}")`
   }
   ```

5. **Add detailed console logging for debugging**

6. **Test with custom embroidery items before deploying**

## Summary

Custom embroidery items are a special case in the system because they:
- Don't exist in the product catalog (productId is the virtual identifier 'custom-embroidery')
- Have pricing stored in customization data, not in product records
- Are made-to-order (no stock validation)
- Have dimensions-based pricing

All payment flows must explicitly handle these items to avoid catalog lookup failures and incorrect pricing calculations.

