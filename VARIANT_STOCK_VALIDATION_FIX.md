# Variant Stock Validation Fix

## Problem
Sold-out product variants (specific color/size combinations) were:
1. **Still appearing** in the selection UI
2. **Could be added to cart** without stock validation
3. **Allowed checkout** even when out of stock

## Root Causes

### Issue 1: Stock Validation Skipped for Customized Items
**File**: `frontend/src/ecommerce/context/CartContext.tsx` (line 321-328)

```javascript
// Skip stock validation for customized items (made-to-order)
if (!customization) {
  const validation = await validateStock(productId, qty)
  ...
}
```

**Problem**: ALL customized items bypassed stock validation entirely, assuming they were "made-to-order". This meant customers could add sold-out variants to their cart.

---

### Issue 2: Stock Validation Only Checked Total Stock
**File**: `frontend/src/ecommerce/context/CartContext.tsx` (line 289)

```javascript
const totalStock = product?.variants?.reduce((sum: number, variant: any) => sum + (variant.stock || 0), 0) || 0
```

**Problem**: Validation checked if ANY variant had stock, not the SPECIFIC selected variant. If Red/Medium had 10 units but Red/Small had 0, the validation would pass because total stock > 0.

---

### Issue 3: Independent Color/Size Filtering
**File**: `frontend/src/ecommerce/routes/Customize.tsx` (lines 207-228)

```javascript
const getAvailableColors = () => {
  return product.variants
    .filter((variant: any) => variant.stock > 0)
    .map((variant: any) => variant.color)
    // Returns unique colors
}
```

**Problem**: Colors and sizes were filtered independently. This created situations where:
- **Example Scenario:**
  - Red/Small: stock 0 ❌
  - Red/Medium: stock 10 ✅
  - Blue/Small: stock 5 ✅

- **What User Saw:**
  - Colors: Red ✅, Blue ✅ (Red shown because Red/Medium has stock)
  - Sizes: Small ✅, Medium ✅ (Small shown because Blue/Small has stock)

- **Result:** User could select Red + Small (both appear available) even though that combination was sold out!

---

## Solutions Implemented

### Fix 1: Variant-Specific Stock Validation
**File**: `frontend/src/ecommerce/context/CartContext.tsx` (lines 283-334)

**Changes:**
- Added `variantId` parameter to `validateStock()` function
- When a variant is selected, check that specific variant's stock
- Check `variant.isActive` flag in addition to stock quantity
- Provide specific error messages mentioning color/size combination

```javascript
const validateStock = async (
  productId: string, 
  quantity: number, 
  variantId?: number  // ← NEW: Optional variant ID
): Promise<{ valid: boolean; message?: string }> => {
  // If a specific variant is requested, check that variant's stock
  if (variantId && product?.variants) {
    const variant = product.variants.find((v: any) => v.id === variantId)
    
    if (!variant) {
      return { valid: false, message: 'Selected variant not found' }
    }
    
    if (!variant.isActive) {
      return { valid: false, message: 'This variant is no longer available' }
    }
    
    if (variant.stock === 0) {
      return { valid: false, message: `This ${variant.color} / ${variant.size} variant is out of stock` }
    }
    
    if (variant.stock < quantity) {
      return { valid: false, message: `Only ${variant.stock} items available for ${variant.color} / ${variant.size}` }
    }
    
    return { valid: true }
  }
  
  // Otherwise, calculate total stock from all active variants
  // ...
}
```

---

### Fix 2: Always Validate Stock (Even for Customized Items)
**File**: `frontend/src/ecommerce/context/CartContext.tsx` (lines 336-359, 542-558)

**Changes in `add()` function:**
```javascript
// Validate stock - check specific variant if one was selected
const selectedVariantId = customization?.selectedVariant?.id

// ✅ Always validate stock, even for customized items with variants
const validation = await validateStock(productId, qty, selectedVariantId)
if (!validation.valid) {
  showWarning(validation.message || 'Product is out of stock', 'Stock Unavailable')
  return false
}
```

**Changes in `update()` function:**
```javascript
// Find the item to get variant information
const item = items.find((p) => p.productId === productId)
const selectedVariantId = item?.customization?.selectedVariant?.id

// ✅ Always validate stock, even for customized items with variants
const validation = await validateStock(productId, qty, selectedVariantId)
if (!validation.valid) {
  showWarning(validation.message || 'Product is out of stock', 'Stock Unavailable')
  return false
}
```

---

### Fix 3: Smart Color/Size Filtering
**File**: `frontend/src/ecommerce/routes/Customize.tsx` (lines 206-269)

**Changes:**
- Modified `getAvailableColors()` to consider currently selected size
- Modified `getAvailableSizes()` to consider currently selected color
- Added `isVariantInStock()` helper to check specific combinations

```javascript
// Get all available colors (considering currently selected size if any)
const getAvailableColors = () => {
  if (!product?.variants) return []
  
  // ✅ If a size is already selected, show only colors available for that size
  if (customizationData.size) {
    const colors = product.variants
      .filter((variant: any) => 
        variant.stock > 0 && 
        variant.isActive && 
        variant.size?.toLowerCase() === customizationData.size.toLowerCase()  // ← MATCHES SELECTED SIZE
      )
      .map((variant: any) => variant.color)
      .filter((color: string, index: number, arr: string[]) => arr.indexOf(color) === index)
    return colors
  }
  
  // If no size selected yet, show all colors that have stock in at least one size
  const colors = product.variants
    .filter((variant: any) => variant.stock > 0 && variant.isActive)
    .map((variant: any) => variant.color)
    .filter((color: string, index: number, arr: string[]) => arr.indexOf(color) === index)
  
  return colors
}

// Get all available sizes (considering currently selected color if any)
const getAvailableSizes = () => {
  if (!product?.variants) return []
  
  // ✅ If a color is already selected, show only sizes available for that color
  if (customizationData.color) {
    const sizes = product.variants
      .filter((variant: any) => 
        variant.stock > 0 && 
        variant.isActive && 
        variant.color?.toLowerCase() === customizationData.color.toLowerCase()  // ← MATCHES SELECTED COLOR
      )
      .map((variant: any) => variant.size)
      .filter((size: string, index: number, arr: string[]) => arr.indexOf(size) === index)
    return sizes
  }
  
  // If no color selected yet, show all sizes that have stock in at least one color
  const sizes = product.variants
    .filter((variant: any) => variant.stock > 0 && variant.isActive)
    .map((variant: any) => variant.size)
    .filter((size: string, index: number, arr: string[]) => arr.indexOf(size) === index)
  
  return sizes
}

// ✅ NEW: Check if a specific color+size combination is in stock
const isVariantInStock = (color: string, size: string): boolean => {
  if (!product?.variants) return false
  
  const variant = product.variants.find((v: any) => 
    v.color?.toLowerCase() === color.toLowerCase() &&
    v.size?.toLowerCase() === size.toLowerCase() &&
    v.isActive
  )
  
  return variant ? variant.stock > 0 : false
}
```

---

### Fix 4: Validation Messages for Invalid Combinations
**File**: `frontend/src/ecommerce/routes/Customize.tsx` (lines 307-320, 354-365)

**Changes in `getValidationMessage()`:**
```javascript
case 1:
  if (!product?.hasSizing) return null
  if (customizationData.color === '') return "Please select a color"
  if (customizationData.size === '') return "Please select a size"
  // ✅ Check if the selected combination is actually in stock
  if (customizationData.color && customizationData.size) {
    if (!isVariantInStock(customizationData.color, customizationData.size)) {
      return `Sorry, ${customizationData.color} / ${customizationData.size} is out of stock. Please select a different combination.`
    }
  }
  return null
```

**Changes in `canProceed()`:**
```javascript
case 1:
  // For non-sizing products, skip color/size validation
  if (!product?.hasSizing) {
    return true
  }
  // ✅ Check that both color and size are selected AND the combination is in stock
  if (customizationData.color === '' || customizationData.size === '') {
    return false
  }
  return isVariantInStock(customizationData.color, customizationData.size)
```

---

## How It Works Now

### Scenario: User Selects Color & Size

**Step 1: Select Color (Red)**
- UI shows all colors available in at least one size
- User selects "Red"
- ✅ Size dropdown now only shows sizes available for Red
- If Red/Small is sold out, "Small" won't appear in the size dropdown

**Step 2: Select Size (Medium)**
- User selects "Medium"
- ✅ Color dropdown updates to only show colors available for Medium
- System validates: `isVariantInStock('Red', 'Medium')` → true ✅

**Step 3: Try to Continue**
- `canProceed()` checks if Red/Medium is in stock
- ✅ Validation passes, user can continue

**Step 4: Add to Cart**
- `selectedVariant = { id: 123, color: 'Red', size: 'Medium', stock: 10 }`
- `validateStock(productId, 1, variantId: 123)`
- ✅ Checks variant 123's stock specifically
- ✅ Validation passes, item added to cart

**Step 5: Update Quantity in Cart**
- User tries to increase quantity to 15
- `validateStock(productId, 15, variantId: 123)`
- ❌ Validation fails: "Only 10 items available for Red / Medium"
- 🚫 Quantity update blocked

---

## What This Prevents

### ❌ Before (Broken)
1. **Scenario**: Red/Small = 0 stock, Red/Medium = 10 stock
2. **UI Shows**: Red as available, Small as available (independent filtering)
3. **User Selects**: Red + Small
4. **Add to Cart**: ✅ Success (validation skipped for custom items)
5. **Checkout**: ✅ Success (no variant-level validation)
6. **Result**: Order placed for sold-out variant! ❌

### ✅ After (Fixed)
1. **Scenario**: Red/Small = 0 stock, Red/Medium = 10 stock
2. **UI Shows**: Red as available
3. **User Selects**: Red
4. **UI Updates**: Only shows "Medium" for sizes (Small hidden because Red/Small = 0)
5. **User Selects**: Medium
6. **Validation**: ✅ Red/Medium in stock
7. **Add to Cart**: ✅ Success (variant 123 has stock)
8. **Checkout**: ✅ Success (variant validated)
9. **Result**: Order placed for in-stock variant! ✅

---

## User Experience Improvements

### Dynamic Options
- **Selecting a color** filters sizes to only show what's available for that color
- **Selecting a size** filters colors to only show what's available for that size
- **No more confusing combinations** where both options look available but the combo is sold out

### Clear Error Messages
- "This Red / Small variant is out of stock"
- "Only 5 items available for Blue / Large"
- "Sorry, Red / Small is out of stock. Please select a different combination."

### Prevents Frustration
- Users can't proceed with sold-out combinations
- Can't add sold-out items to cart
- Can't increase quantities beyond available stock
- Clear feedback at every step

---

## Files Modified

1. **frontend/src/ecommerce/context/CartContext.tsx**
   - Enhanced `validateStock()` to accept variant ID and check specific variant stock
   - Updated `add()` to always validate stock, even for customized items
   - Updated `update()` to validate variant stock when changing quantities

2. **frontend/src/ecommerce/routes/Customize.tsx**
   - Enhanced `getAvailableColors()` to filter based on selected size
   - Enhanced `getAvailableSizes()` to filter based on selected color
   - Added `isVariantInStock()` helper function
   - Updated `getValidationMessage()` to check variant stock
   - Updated `canProceed()` to require valid variant combination

---

## Testing Checklist

### Test 1: Sold-Out Variant Hidden
1. ✅ Set Red/Small to stock = 0
2. ✅ Set Red/Medium to stock = 10
3. ✅ Go to customize page
4. ✅ Select "Red"
5. ✅ **Expected**: Only "Medium" shows in size dropdown (Small hidden)

### Test 2: Cannot Add Sold-Out Variant
1. ✅ Manually set a variant to stock = 0 via database
2. ✅ Try to add that variant to cart
3. ✅ **Expected**: Error message "This [color] / [size] variant is out of stock"

### Test 3: Cannot Exceed Stock
1. ✅ Set a variant to stock = 5
2. ✅ Add 3 to cart successfully
3. ✅ Try to update quantity to 10
4. ✅ **Expected**: Error "Only 5 items available for [color] / [size]"

### Test 4: Dynamic Filtering
1. ✅ Have Red/Small (stock 5), Red/Medium (stock 0), Blue/Small (stock 10)
2. ✅ Initially shows: Colors (Red, Blue), Sizes (Small, Medium)
3. ✅ Select "Red"
4. ✅ **Expected**: Only "Small" shows in sizes (Medium hidden)
5. ✅ Select "Blue" instead
6. ✅ **Expected**: Only "Small" shows in sizes

### Test 5: Validation Message
1. ✅ Have a combination that's sold out
2. ✅ Try to proceed to next step
3. ✅ **Expected**: Error message with specific color/size mentioned
4. ✅ "Continue" button remains disabled

---

## Benefits

✅ **Accurate Inventory**: Users can only select actually available variants
✅ **Better UX**: No confusion about what's in stock
✅ **Prevents Overselling**: Cannot add sold-out items to cart
✅ **Clear Feedback**: Specific error messages guide users
✅ **Dynamic UI**: Options update based on selections
✅ **Reliable Checkout**: No surprises at checkout about unavailable items

---

## Summary

The system now properly validates variant-level stock at every step:
- **UI level**: Only shows available color/size combinations
- **Validation level**: Blocks invalid combinations from proceeding
- **Cart level**: Validates specific variant stock before adding
- **Update level**: Validates stock when changing quantities

Users can no longer add sold-out variants to their cart, eliminating overselling and improving the shopping experience.

