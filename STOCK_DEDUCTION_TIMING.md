# Stock Deduction Timing - Implementation Guide

## Decision: Deduct Stock When "In Production"

### Changed From: `delivered` → To: `in-production`

## Why "In Production" is Best

### Your Business Model:
1. **Custom embroidery orders** - Design approval required before production
2. **Physical products** (caps, bags) - Need inventory management
3. **Design iteration** - Customers may reject/request changes
4. **Made-to-order** - Products are customized per order

### Order Flow:
```
1. Customer submits order
2. Admin reviews design          ← Design might be rejected
3. Customer approves design       ← Customer might want changes
4. Payment processed              ← Money received
5. IN PRODUCTION ← ✅ DEDUCT STOCK HERE
6. Shipped
7. Delivered
```

## Comparison of Options

| Timing | Pros | Cons | Recommended? |
|--------|------|------|--------------|
| **When Paid** | Prevents overselling | Design rejection ties up stock | ❌ No |
| **In Production** | Accurate inventory, prevents overselling | Slightly complex | ✅ **YES** |
| **When Shipped** | Matches physical inventory | Can oversell | ⚠️ Maybe |
| **When Delivered** | Only after confirmation | Very inaccurate, high risk | ❌ No |

## Implementation

### Code Change:
```typescript
// OLD (Not recommended):
if (status === 'delivered') {
  await deductStockForOrder(orderId);
}

// NEW (Recommended):
if (status === 'in-production') {
  await deductStockForOrder(orderId);
}
```

### Location:
`backend/src/controllers/orderReviewController.ts` → `updateReviewStatus` function

## Order Status Flow

### Complete Order Lifecycle:
```
┌─────────────────────────────────────────────────────┐
│  1. For Review (pending)                            │
│     - Customer submits order                        │
│     - Stock: Available ✅                           │
├─────────────────────────────────────────────────────┤
│  2. Design Review Pending (picture-reply-pending)   │
│     - Admin uploads design samples                  │
│     - Stock: Available ✅                           │
├─────────────────────────────────────────────────────┤
│  3. Customer Approves Design                        │
│     - Customer confirms design looks good           │
│     - Stock: Available ✅                           │
├─────────────────────────────────────────────────────┤
│  4. Pending Payment (pending-payment)               │
│     - Waiting for customer to pay                   │
│     - Stock: Available ✅                           │
├─────────────────────────────────────────────────────┤
│  5. Payment Complete (approved-processing)          │
│     - Payment received                              │
│     - Stock: Available ✅                           │
├─────────────────────────────────────────────────────┤
│  6. IN PRODUCTION ← ✅ DEDUCT STOCK HERE            │
│     - Actually using the product                    │
│     - Stock: DEDUCTED ⬇️                            │
├─────────────────────────────────────────────────────┤
│  7. Shipped (shipped)                               │
│     - Product left warehouse                        │
│     - Stock: Already deducted                       │
├─────────────────────────────────────────────────────┤
│  8. Delivered (delivered)                           │
│     - Customer received product                     │
│     - Stock: Already deducted                       │
└─────────────────────────────────────────────────────┘
```

## Benefits of "In Production" Timing

### 1. Prevents Overselling
```
Scenario: You have 10 trucker caps in stock

With "In Production" deduction:
- Order 1: In production → 9 caps left
- Order 2: Pending payment → 10 caps still available
- Order 3: Design approval → 10 caps still available
- System prevents Order 4 from ordering 10th cap ✅

With "Delivered" deduction (old way):
- Order 1-10: All "in progress"
- All show 10 caps available
- Order 11 comes in → System allows it ❌
- You're now short 1 cap!
```

### 2. Accurate Inventory
```
Admin Dashboard:
"Trucker Caps: 5 in stock"

Means:
- 5 physically in warehouse
- Available for new orders
- Not committed to production ✅

With old method:
"Trucker Caps: 5 in stock"
Could mean:
- 5 in warehouse
- But 3 are for orders in production
- Only 2 actually available ❌
```

### 3. Handles Rejections Gracefully
```
Scenario: Customer rejects design before production

With "In Production":
- Stock never deducted
- Available for other orders immediately ✅

With "When Paid":
- Stock deducted at payment
- Need to restore stock when rejected
- More complex logic ❌
```

### 4. Better Business Decisions
```
You can see:
- 50 caps in stock
- 30 caps in production (committed)
- 20 caps available for new orders

Plan accordingly:
- Reorder when available < 10
- Know exactly what's free vs committed ✅
```

## Stock Service Logic

The `stockService.ts` already handles:

### ✅ Skips Custom Embroidery
```typescript
// Custom embroidery items don't have stock limits
if (item.productId === 'custom-embroidery') {
  continue; // Skip, made-to-order
}
```

### ✅ Only Deducts Physical Products
```typescript
// Only deduct stock for products with variants
const variant = await ProductVariant.findById(item.variantId);
if (variant && variant.stock > 0) {
  // Deduct stock
  await variant.update({ 
    stock: Math.max(0, variant.stock - quantity) 
  });
}
```

### ✅ Logs All Actions
```typescript
logger.info(`✅ Stock deducted: ${product.name} - ${quantity} units`);
```

## Admin Workflow

### When to Change Status:

```
1. Order submitted → "For Review"
2. Admin uploads design samples → "Design Review Pending"  
3. Customer approves → "Pending Payment"
4. Customer pays → "Payment Complete"
5. Admin starts production → "In Production" ← ✅ STOCK DEDUCTED
6. Admin ships product → "Shipped"
7. Customer confirms delivery → "Delivered"
```

### What Admin Sees:

```
Order Status: In Production

Stock Changes:
✅ Trucker Cap (Blue, Large): Stock 10 → 9
✅ Trucker Cap (Red, Medium): Stock 5 → 4
```

## Edge Cases & Handling

### Case 1: Order Cancelled After Production Starts
```typescript
// Would need to implement:
if (status === 'cancelled' && previousStatus === 'in-production') {
  await restoreStockForOrder(orderId);
}
```

### Case 2: Refund After Delivery
```typescript
// Stock already deducted
// If you want to restore:
await restoreStockForOrder(orderId);
```

### Case 3: Stock Deduction Fails
```typescript
// Current implementation:
try {
  await deductStockForOrder(orderId);
} catch (error) {
  logger.error('Stock deduction failed');
  // Don't block status update
  // Admin can manually adjust inventory
}
```

## Testing

### Test Scenario 1: Happy Path
```
1. Create order with physical product (Trucker Cap)
2. Check stock: 10 units
3. Admin changes status to "In Production"
4. Check stock: 9 units ✅
5. Complete order (ship, deliver)
6. Stock remains: 9 units ✅
```

### Test Scenario 2: Design Rejection
```
1. Create order with physical product
2. Check stock: 10 units
3. Admin changes status to "For Review" → "Pending Payment"
4. Stock remains: 10 units ✅
5. Order rejected
6. Stock remains: 10 units ✅ (never deducted)
```

### Test Scenario 3: Multiple Orders
```
1. Order A: In Production → Stock: 10 → 9
2. Order B: Pending Payment → Stock: 9 (available)
3. Order C: For Review → Stock: 9 (available)
4. Order B: Moves to Production → Stock: 9 → 8 ✅
```

## Monitoring & Logs

### Backend Logs to Watch:
```
✅ Stock deducted successfully for order 123 entering production
   Product: Trucker Cap (Blue, Large)
   Quantity: 2
   Stock: 10 → 8

⚠️ Failed to deduct stock for order 124
   Reason: Product out of stock

❌ Error deducting stock for order 125
   Error: Database connection failed
```

### Admin Dashboard:
```
Low Stock Alerts:
⚠️ Trucker Cap (Blue, Large): 2 units left
⚠️ Tote Bag (Black, One Size): 1 unit left
```

## Database Fields

### order_reviews table:
```sql
status ENUM(
  'pending',
  'approved',
  'rejected',
  'picture-reply-pending',
  'pending-payment',
  'approved-processing',
  'in-production',  -- ← Stock deducted when this status
  'shipped',
  'delivered'
)
```

### product_variants table:
```sql
stock INT NOT NULL DEFAULT 0  -- Current available stock
```

## Summary

### ✅ Changed: Stock Deduction Timing
```
FROM: When order status = 'delivered'
TO:   When order status = 'in-production'
```

### ✅ Why:
1. Prevents overselling
2. Accurate inventory counts
3. Better business decisions
4. Handles design rejections gracefully
5. Matches when product is actually used

### ✅ Applies To:
- Physical products (caps, bags, accessories)
- Products with variants (color, size)

### ✅ Does NOT Apply To:
- Custom embroidery items (made-to-order, unlimited)
- Digital products
- Services

### ✅ When It Happens:
- Admin changes order status to "In Production"
- After payment is received
- After design is approved
- Before shipping

**The change is complete and ready to use!** When you restart the backend and move an order to "In Production", stock will be automatically deducted.

