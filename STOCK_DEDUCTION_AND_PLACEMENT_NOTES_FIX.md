# Stock Deduction Timing and Placement Notes Display Fix

## Issues Addressed

### Issue 1: Stock Deduction Timing
**Problem**: Stock was being deducted when order status changed to `'in-production'` instead of earlier statuses like `'approved'` or `'processing'`.

**Impact**: Inventory wasn't reserved until late in the order lifecycle, risking overselling.

### Issue 2: Placement Notes Not Appearing in Admin Modal
**Problem**: Customer placement notes (from Step 3 in customize flow) were not displayed in the admin pending review orders modal.

**Impact**: Admins couldn't see critical customer instructions about where to place designs on products.

### Issue 3: Multi-Design Support
**Confirmed**: The system fully supports multi-design format with per-design placement notes.

---

## Fix 1: Stock Deduction at Approved/Processing Status

### File: `backend/src/controllers/orderReviewController.ts`

**Lines**: 503-583

**Changes**:
1. Fetch current order status before updating (prevents double deduction)
2. Deduct stock when status changes to `'approved'`, `'processing'`, or `'pending-payment'`
3. Skip deduction if already deducted (prevent double deduction)

**Before**:
```typescript
// Stock deducted at 'in-production' status
if (status === 'in-production') {
  const { deductStockForOrder } = await import('../services/stockService');
  const stockDeducted = await deductStockForOrder(parseInt(id));
  ...
}
```

**After**:
```typescript
// Fetch current order status before updating
const [orderResult] = await sequelize.query(`
  SELECT id, status 
  FROM order_reviews 
  WHERE id = ?
`, { replacements: [id] });

const currentOrder = orderResult[0] as any;
const previousStatus = currentOrder.status;

// Deduct stock when order is approved/processing
// Only deduct once - check if previous status was NOT already approved or processing
const shouldDeductStock = (finalStatus === 'approved' || finalStatus === 'processing' || finalStatus === 'pending-payment') && 
                          previousStatus !== 'approved' && 
                          previousStatus !== 'processing' &&
                          previousStatus !== 'pending-payment';

if (shouldDeductStock) {
  const { deductStockForOrder } = await import('../services/stockService');
  const stockDeducted = await deductStockForOrder(parseInt(id));
  if (stockDeducted) {
    logger.info(`✅ Stock deducted successfully for order ${id} (status: ${previousStatus} → ${finalStatus})`);
  }
} else if ((finalStatus === 'approved' || finalStatus === 'processing' || finalStatus === 'pending-payment') && 
           (previousStatus === 'approved' || previousStatus === 'processing' || previousStatus === 'pending-payment')) {
  logger.info(`⏭️ Skipping stock deduction for order ${id} - already deducted`);
}
```

### Stock Deduction Flow

**Order Status Progression**:
```
pending 
  ↓
approved (or pending-payment) ← ✅ STOCK DEDUCTED HERE
  ↓
processing ← ✅ STOCK DEDUCTED HERE (if not already deducted)
  ↓
in-production
  ↓
shipped
  ↓
delivered
```

### Prevent Double Deduction

The system checks the **previous status** before deducting:
- If changing from `pending` → `approved`: ✅ Deduct stock
- If changing from `approved` → `processing`: ⏭️ Skip (already deducted)
- If changing from `processing` → `in-production`: ⏭️ Skip (already deducted)

### Logging

```
✅ Stock deducted successfully for order 123 (status: pending → pending-payment)
⏭️ Skipping stock deduction for order 123 - already deducted (status: approved → processing)
```

---

## Fix 2: Display Placement Notes in Admin Modal

### File: `frontend/src/admin/pages/PendingReview.tsx`

**Changes**:

#### A. Multi-Design Format (Lines 2151-2162)

Added prominent amber-highlighted placement notes display for each design:

```tsx
{/* Customer Placement Notes - Most Important */}
{design.notes && design.notes.trim().length > 0 && (
  <div className="mt-2 bg-amber-50 border border-amber-300 rounded p-2">
    <div className="flex items-start space-x-2">
      <MessageSquare className="h-3 w-3 text-amber-700 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-900 mb-0.5">Placement Instructions:</p>
        <p className="text-xs text-amber-800 whitespace-pre-wrap break-words">{design.notes}</p>
      </div>
    </div>
  </div>
)}
```

#### B. Legacy Single-Design Format (Lines 2251-2262)

Added same placement notes display for single-design format:

```tsx
{/* Legacy Single Design Notes */}
{item.customization.notes && item.customization.notes.trim().length > 0 && (
  <div className="mt-2 bg-amber-50 border border-amber-300 rounded p-2">
    <div className="flex items-start space-x-2">
      <MessageSquare className="h-3 w-3 text-amber-700 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-900 mb-0.5">Placement Instructions:</p>
        <p className="text-xs text-amber-800 whitespace-pre-wrap break-words">{item.customization.notes}</p>
      </div>
    </div>
  </div>
)}
```

### Visual Design

**Amber Highlighting**:
- `bg-amber-50`: Light amber background
- `border-amber-300`: Amber border
- `text-amber-900`: Dark amber text for emphasis
- `MessageSquare` icon: Visual indicator for customer message

**Layout**:
- Positioned below embroidery style options
- Icon + label + content layout
- `whitespace-pre-wrap`: Preserves line breaks from customer input
- `break-words`: Prevents overflow on long words

---

## Multi-Design Support Confirmation

### Data Structure

The system supports **both** data structures:

#### Multi-Design Format (Current)
```javascript
{
  customization: {
    designs: [
      {
        id: "design-1",
        name: "Logo Front",
        preview: "data:image/png...",
        dimensions: { width: 8.28, height: 6.60 },
        notes: "Place on left chest, 3 inches from top", // ← Per-design notes
        selectedStyles: {
          coverage: { name: "Small Coverage", price: 10 },
          material: { name: "Camouflage Material", price: 5 },
          border: { name: "Merrowed Border", price: 3 }
        }
      },
      {
        id: "design-2",
        name: "Text Back",
        notes: "Center on back, below collar" // ← Different notes for different design
      }
    ]
  }
}
```

#### Legacy Single-Design Format
```javascript
{
  customization: {
    design: {
      name: "Logo",
      preview: "data:image/png..."
    },
    notes: "Place on left chest", // ← Single notes field
    placement: "manual",
    selectedStyles: { ... }
  }
}
```

### Cart Modal (Already Working)

The cart modal (`frontend/src/ecommerce/routes/Cart.tsx`) **already displays placement notes correctly** for both formats:

**Multi-Design** (Lines 845-850):
```tsx
{design.notes && (
  <div className="mt-1">
    <span className="text-gray-600">Notes:</span>
    <span className="font-medium text-xs block">{design.notes}</span>
  </div>
)}
```

**Single-Design** (Lines 814-819):
```tsx
{selectedItem.customization.notes && (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Notes:</span>
    <span className="font-medium text-right">{selectedItem.customization.notes}</span>
  </div>
)}
```

---

## Before & After Examples

### Admin Modal Display

**Before**:
```
Uploaded Designs: 1 files
  Design: download-removebg-preview - Copy.png
  8.28" × 6.60"
  Small Coverage (2x2 inches)
  Camouflage Material
  Merrowed Border
  
Product Variant
  Size: l
  Color: Red
```

**After**:
```
Uploaded Designs: 1 files
  Design: download-removebg-preview - Copy.png
  8.28" × 6.60"
  Small Coverage (2x2 inches)
  Camouflage Material
  Merrowed Border
  
  📝 Placement Instructions:
  Place on left chest, 3 inches from top and 2 inches from left edge
  
Product Variant
  Size: l
  Color: Red
```

### Stock Deduction Timing

**Before**:
```
Order Status: pending → approved → processing → in-production ← Stock deducted here
Problem: Long delay before inventory reserved
```

**After**:
```
Order Status: pending → approved ← Stock deducted here
                    → processing ← Or here if approved skipped
```

---

## Benefits

### Stock Management
✅ **Earlier Inventory Reservation**: Stock deducted as soon as order is approved/processing
✅ **Prevents Overselling**: Inventory locked in before production begins
✅ **No Double Deduction**: Safeguards prevent stock from being deducted twice
✅ **Clear Logging**: Easy to track when stock was deducted

### Admin Experience
✅ **Visible Placement Instructions**: Admins can see exactly where customers want designs placed
✅ **Multi-Design Support**: Each design shows its own placement notes
✅ **Prominent Display**: Amber highlighting makes notes stand out
✅ **Preserved Formatting**: Line breaks and spacing preserved from customer input

### Data Integrity
✅ **Backward Compatible**: Works with both legacy single-design and new multi-design formats
✅ **Graceful Handling**: Empty or missing notes don't display anything
✅ **Safe Updates**: Status changes don't cause errors or duplicate stock deductions

---

## Testing Checklist

### Stock Deduction
- [ ] Order changes from `pending` → `approved`: Stock deducted ✅
- [ ] Order changes from `pending` → `processing`: Stock deducted ✅
- [ ] Order changes from `approved` → `processing`: Stock NOT deducted again ✅
- [ ] Order changes from `processing` → `in-production`: Stock NOT deducted again ✅
- [ ] Logs show correct status transitions ✅

### Placement Notes Display
- [ ] Multi-design order with notes: Notes appear in amber box ✅
- [ ] Single-design order with notes: Notes appear in amber box ✅
- [ ] Order without notes: No amber box displayed ✅
- [ ] Long notes: Text wraps correctly without overflow ✅
- [ ] Multi-line notes: Line breaks preserved ✅

---

## Summary

This fix addresses three critical issues:

1. **Stock Timing**: Stock now deducts at `approved`/`processing` status instead of `in-production`, preventing overselling
2. **Placement Notes**: Admin modal now prominently displays customer placement instructions in an amber-highlighted box
3. **Multi-Design**: Confirmed full support for multiple designs with per-design placement notes

Both the cart modal and admin pending review modal now properly display placement notes, ensuring admins have all the information they need to fulfill custom embroidery orders correctly.

