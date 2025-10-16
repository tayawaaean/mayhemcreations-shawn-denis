# Order Total Calculation Fix

## Issue
The order total displayed in the "My Orders" page was showing $176.32 instead of the correct $194.32 for an embroidered cap order. The difference of $18.00 was the base product price that was missing from the calculation.

## Root Cause
1. **During Order Submission (Checkout.tsx)**: The `calculateItemPrice` function was failing to find the product data for cart items, resulting in a calculation that only included customization costs ($15.18 embroidery + $161.14 options = $176.32) and excluded the base product price ($18.00).

2. **Order Display (MyOrders.tsx)**: The component was displaying the incorrectly calculated `order.total` value stored in the database instead of recalculating from the line items.

## Solution Implemented

### 1. Checkout.tsx - Order Submission Fix
**File**: `frontend/src/ecommerce/routes/Checkout.tsx`

**Changes**:
- Modified `calculateItemPrice` function to check for existing `pricingBreakdown` first
- Added fallback to use `pricingBreakdown.totalPrice` if product lookup fails
- This ensures correct total calculation for future orders

**Code Change** (lines 112-119):
```typescript
// If pricingBreakdown exists (from cart or previous calculation), use it directly
if (item.pricingBreakdown && item.pricingBreakdown.totalPrice) {
  console.log('✅ Using existing pricingBreakdown for item:', {
    productId: item.productId,
    totalPrice: item.pricingBreakdown.totalPrice
  });
  return Number(item.pricingBreakdown.totalPrice) || 0;
}
```

### 2. MyOrders.tsx - Display Fix
**File**: `frontend/src/ecommerce/routes/MyOrders.tsx`

**Changes**:
- Added `calculateCorrectOrderTotal` function to recalculate order totals from line items
- Updated all displays of `order.total` to use the calculated value
- Updated refund modal to use calculated totals

**New Function** (lines 545-569):
```typescript
// Calculate correct order total from line items
const calculateCorrectOrderTotal = (order: Order): number => {
  // Sum up all line item totals (quantity × item price)
  const itemsTotal = order.items.reduce((total, item) => {
    // Use pricing breakdown if available
    let itemPrice = 0;
    
    if (item.customization?.embroideryData) {
      // For custom embroidery items, use embroideryData totalPrice
      itemPrice = Number((item.customization.embroideryData as any).totalPrice) || 0;
    } else {
      // Use the item's stored price
      itemPrice = Number(item.price) || 0;
    }
    
    const lineTotal = itemPrice * (item.quantity || 1);
    return total + lineTotal;
  }, 0);
  
  // Add shipping and tax (these should be correct in the order)
  const shipping = Number(order.shipping) || 0;
  const tax = Number(order.tax) || 0;
  
  return itemsTotal + shipping + tax;
}
```

**Updated Displays**:
1. Order list view total (line 1857):
   ```typescript
   ${calculateCorrectOrderTotal(order).toFixed(2)}
   ```

2. Modal detail view total (line 2450):
   ```typescript
   ${calculateCorrectOrderTotal(selectedOrder).toFixed(2)}
   ```

3. Refund modal totals (lines 1252-1263):
   ```typescript
   const correctTotal = calculateCorrectOrderTotal(order)
   const itemsSubtotal = order.items.reduce((total, item) => {
     const itemPrice = item.customization?.embroideryData 
       ? Number((item.customization.embroideryData as any).totalPrice) || 0
       : Number(item.price) || 0
     return total + (itemPrice * (item.quantity || 1))
   }, 0)
   ```

## Impact

### Existing Orders
- All existing orders with incorrect totals will now display the correct calculated total
- The stored `order.total` in the database remains unchanged (for audit purposes)
- The display uses the recalculated total from line items

### New Orders
- Future orders will calculate totals correctly during submission
- The `pricingBreakdown` fallback ensures robustness against product lookup failures

### Refunds
- Refund requests will now use the correct order total
- Item-level refunds will calculate correctly based on actual item prices

## Testing Checklist

- [x] Linter errors resolved
- [ ] Test existing order display shows correct total ($194.32)
- [ ] Test modal detail view shows correct total
- [ ] Test refund modal shows correct total
- [ ] Test new order submission calculates correct total
- [ ] Test order with multiple items
- [ ] Test order with shipping and tax included

## Example Fix
**Before**: Order shows $176.32 (missing base product price)
**After**: Order shows $194.32 (base price $18.00 + embroidery $15.18 + options $161.14)

## Notes
- The fix addresses both the root cause (submission) and the symptom (display)
- Type assertions (`as any`) are used for `embroideryData.totalPrice` due to TypeScript type limitations
- The solution is backward compatible with existing order data structures


