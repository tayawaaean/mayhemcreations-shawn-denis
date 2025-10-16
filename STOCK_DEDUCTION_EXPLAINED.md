# Stock Deduction System - How It Works

## ✅ Yes! Stock is Automatically Deducted on Payment

Your system **automatically deducts stock** when a payment is successfully completed.

## 🔄 When Stock is Deducted

### 1. **Stripe Payment Success** (via Webhook)

**File:** `backend/src/controllers/webhookController.ts` (Lines 202-215)

**Trigger:** When Stripe sends `checkout.session.completed` webhook

**Process:**
```typescript
// 1. Stripe processes payment successfully
// 2. Stripe sends webhook to your backend
// 3. Backend updates order status to 'approved-processing'
// 4. Backend calls deductStockForOrder(orderId)
// 5. Stock is deducted from variants

const { deductStockForOrder } = await import('../services/stockService');
const stockDeducted = await deductStockForOrder(order.id);
if (stockDeducted) {
  logger.info(`✅ Stock deducted successfully for order ${order.id} after payment`);
}
```

### 2. **PayPal Payment Capture**

**File:** `backend/src/controllers/paypalController.ts` (Lines 274-287)

**Trigger:** When PayPal payment is captured after user approval

**Process:**
```typescript
// 1. User approves payment on PayPal
// 2. User redirected back to your site
// 3. Backend captures the PayPal payment
// 4. Backend updates order status to 'approved-processing'
// 5. Backend calls deductStockForOrder(orderId)
// 6. Stock is deducted from variants

const { deductStockForOrder } = await import('../services/stockService');
const stockDeducted = await deductStockForOrder(order.id);
if (stockDeducted) {
  logger.info(`✅ Stock deducted successfully for order ${order.id} after PayPal payment`);
}
```

### 3. **Admin Status Change** (Manual Deduction)

**File:** `backend/src/controllers/orderReviewController.ts` (Lines 624-635)

**Trigger:** When admin changes order status to production-related status

**Process:**
```typescript
// Only deduct if order is moving to production and hasn't been paid yet
const shouldDeductStock = finalStatus === 'ready-for-production' || 
                          finalStatus === 'in-production' ||
                          finalStatus === 'ready-for-checkout';

if (shouldDeductStock) {
  const { deductStockForOrder } = await import('../services/stockService');
  const stockDeducted = await deductStockForOrder(parseInt(id));
}
```

## 📦 How Stock Deduction Works

### Stock Deduction Logic

**File:** `backend/src/services/stockService.ts` (Lines 14-131)

```typescript
export const deductStockForOrder = async (orderId: number): Promise<boolean> => {
  // 1. Fetch order from database
  // 2. Parse order_data JSON to get items
  // 3. For each item:
  
  for (const item of items) {
    const productId = item.productId;
    const quantity = item.quantity || 1;
    const variantId = item.customization?.selectedVariant?.id || 
                      item.selectedVariant?.id || null;
    
    // Skip custom embroidery (no physical stock)
    if (productId === 'custom-embroidery') continue;
    
    if (variantId) {
      // Deduct from specific variant (color/size combination)
      await sequelize.query(`
        UPDATE variants 
        SET stock = GREATEST(stock - ?, 0),
            updated_at = NOW()
        WHERE id = ? AND stock >= ?
      `, [quantity, variantId, quantity]);
    } else {
      // Fallback: Deduct from first available variant
      // Find variant with most stock
      // Deduct if sufficient stock available
    }
  }
}
```

### Key Features:

**1. Variant-Based Deduction:**
- Deducts from the **specific variant** (color + size combination)
- Example: Blue/Medium variant has separate stock from Blue/Large

**2. Quantity Handling:**
- Multiplies deduction by quantity
- Example: 25 items × 1 = deduct 25 from stock

**3. Safety Checks:**
- `GREATEST(stock - quantity, 0)` - Never goes below 0
- `WHERE stock >= quantity` - Only deducts if sufficient stock
- Continues processing other items if one fails

**4. Custom Embroidery Exception:**
- Skips stock deduction for `custom-embroidery` items
- These are made-to-order, no physical inventory

## 🔍 Example Scenarios

### Scenario 1: Stripe Payment for 25 T-Shirts

```
Order: 25 × Embroidered Classic Tee (White/S)

Payment Flow:
1. User completes Stripe payment
2. Stripe webhook → checkout.session.completed
3. Backend receives webhook
4. Updates order status → 'approved-processing'
5. Calls deductStockForOrder(123)
6. Finds variant: White/S
7. Executes: UPDATE variants SET stock = stock - 25 WHERE id = 456
8. Stock reduced: 100 → 75 ✅

Result: Stock automatically deducted!
```

### Scenario 2: PayPal Payment for Multiple Items

```
Order:
- 1 × Embroidered Cap (Black/One Size) - 2 designs
- 1 × Embroidered Cap (Black/One Size) - 1 design

Payment Flow:
1. User approves PayPal payment
2. Returns to site with token
3. Backend captures PayPal payment
4. Updates order status → 'approved-processing'
5. Calls deductStockForOrder(124)
6. Item 1: Deduct 1 from Black/One Size
7. Item 2: Deduct 1 from Black/One Size
8. Total deducted: 2 from Black/One Size variant

Result: Stock automatically deducted!
```

### Scenario 3: Custom Embroidery Order

```
Order: Custom Embroidery Design

Payment Flow:
1. User completes payment
2. Backend updates order status
3. Calls deductStockForOrder(125)
4. Detects productId = 'custom-embroidery'
5. Skips stock deduction (made-to-order) ✅

Result: No stock deducted (correct behavior)
```

## ⚙️ Configuration

### Automatic Deduction Triggers:

**Payment Success:**
- ✅ Stripe checkout completed (webhook)
- ✅ PayPal payment captured (API call)

**Status Changes:**
- ✅ Order moved to 'ready-for-production'
- ✅ Order moved to 'in-production'
- ✅ Order moved to 'ready-for-checkout'

### Items That Deduct Stock:
- ✅ Regular products (t-shirts, caps, etc.)
- ✅ Customized products with variants
- ✅ Any product with a variant ID

### Items That Don't Deduct Stock:
- ❌ Custom embroidery (productId === 'custom-embroidery')
- ❌ Items without productId
- ❌ Items without variants (no variant found)

## 🔄 Stock Restoration (Refunds)

**File:** `backend/src/services/stockService.ts` (Lines 138-235)

```typescript
export const restoreStockForOrder = async (orderId: number): Promise<boolean> => {
  // Restore stock when order is canceled or refunded
  // Adds quantity back to variant stock
}
```

**When Stock is Restored:**
- ✅ Order is canceled
- ✅ Order is refunded
- ✅ Admin manually restores stock

## 🛡️ Safety Features

### 1. Never Goes Negative:
```sql
UPDATE variants 
SET stock = GREATEST(stock - ?, 0)  -- Never below 0
WHERE id = ? AND stock >= ?         -- Only if sufficient stock
```

### 2. Transaction Safety:
- Uses database transactions
- Rolls back on error
- Continues with other items if one fails

### 3. Logging:
```
✅ Stock deducted successfully for order 123
⚠️ Insufficient stock for product 9 - needed 25, available 10
❌ Error deducting stock for order 123: [error details]
```

### 4. Error Handling:
```typescript
try {
  const stockDeducted = await deductStockForOrder(order.id);
} catch (stockError) {
  logger.error(`❌ Error deducting stock for order ${order.id}:`, stockError);
  // Don't fail the payment if stock deduction fails
  // Admin can manually adjust inventory
}
```

**Important:** Even if stock deduction fails, payment still processes! This prevents payment issues from blocking stock management.

## 📊 Stock Deduction Timeline

```
User Journey:
1. Add items to cart (stock NOT deducted)
2. Proceed to checkout (stock NOT deducted)
3. Submit for review (stock NOT deducted)
4. Admin approves (stock NOT deducted)
5. Click "Proceed to Payment" (stock NOT deducted)
6. Complete payment → ✅ STOCK DEDUCTED HERE!
7. Payment confirmed (stock already deducted)
8. Admin moves to production (stock already deducted, skipped)
9. Order shipped (stock already deducted)
```

**Key Point:** Stock is only deducted **after successful payment**, not before!

## 🎯 Benefits of This Approach

### Why Deduct After Payment?

**✅ Prevents Overselling:**
- Stock only reduced when payment confirmed
- No ghost reservations from unpaid orders
- Real-time accurate stock levels

**✅ Better Inventory Management:**
- Stock reflects actual commitments
- No need to release reserved stock
- Simpler inventory tracking

**✅ Customer Experience:**
- Items remain available until paid
- No "held stock" timeouts
- Fair first-come-first-served

**✅ Business Logic:**
- Payment = commitment
- Clear deduction point
- Easy to audit

## 🔢 Example Calculation

### Before Order:
```
Product: Embroidered Classic Tee
Variant: White/S
Stock: 100 units
```

### After Order Submission:
```
Order submitted for review
Stock: 100 units (unchanged)
```

### After Admin Approval:
```
Order approved, awaiting payment
Stock: 100 units (unchanged)
```

### After Payment Success:
```
Payment completed via Stripe
Order: 25 × White/S
Stock: 100 - 25 = 75 units ✅ DEDUCTED!
```

### If Order Refunded:
```
Order refunded
Stock: 75 + 25 = 100 units ✅ RESTORED!
```

## 🧪 How to Verify

### 1. Check Stock Before Payment:
```sql
SELECT stock FROM variants WHERE id = 456;
-- Result: 100
```

### 2. Complete Payment:
- Process Stripe or PayPal payment
- Wait for webhook/capture to process

### 3. Check Stock After Payment:
```sql
SELECT stock FROM variants WHERE id = 456;
-- Result: 75 (if 25 ordered)
```

### 4. Check Logs:
```
backend/logs/combined.log:
✅ Stock deducted successfully for order 123 after payment
```

## 📝 Summary

**Your payment system automatically deducts stock:**

| Payment Method | Auto Deduct | When | File |
|---------------|-------------|------|------|
| **Stripe** | ✅ Yes | On webhook success | webhookController.ts |
| **PayPal** | ✅ Yes | On payment capture | paypalController.ts |
| **Admin Action** | ✅ Yes | On status → production | orderReviewController.ts |

**Stock Deduction Features:**
- ✅ Automatic after payment success
- ✅ Variant-specific (color + size)
- ✅ Quantity-aware (handles bulk orders)
- ✅ Safe (never goes negative)
- ✅ Logged (full audit trail)
- ✅ Restorable (on refunds/cancellations)
- ✅ Skips custom embroidery (made-to-order)

**Result:** Fully automated inventory management! 🎉

**No manual stock adjustment needed** - the system handles it automatically when payment is confirmed! 🚀

