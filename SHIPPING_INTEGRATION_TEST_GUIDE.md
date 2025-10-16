# Shipping Integration - Testing Guide

## What Was Implemented

The complete shipping flow has been implemented from start to finish. Here's what changed:

### Files Modified (5 files)

1. **backend/src/scripts/add-shipping-fields.sql** - NEW
   - Database migration to add shipping fields to order_reviews table
   
2. **backend/src/controllers/orderReviewController.ts** - UPDATED
   - Added validation for shipping address and shipping method
   - Updated INSERT query to store shipping_address, shipping_method, customer_notes
   - Updated response to include shipping information
   
3. **frontend/src/ecommerce/routes/Checkout.tsx** - UPDATED
   - Changed from 3-step payment flow to 2-step review flow
   - Step 1: Shipping address + automatic rate calculation
   - Step 2: Review order with shipping + submit for admin review
   - Removed payment processing (moved to OrderCheckout after approval)
   
4. **frontend/src/ecommerce/routes/Cart.tsx** - UPDATED
   - Changed "Submit for Review" to "Proceed to Checkout"
   - Now navigates to /checkout instead of direct submission
   
5. **frontend/src/ecommerce/routes/OrderCheckout.tsx** - UPDATED
   - Pre-fills shipping address from stored order data
   - Pre-loads shipping method from stored order data
   - Customer can verify or change address before payment

---

## Before You Test

### Step 1: Run Database Migration

**Option A: Using PowerShell Script**
```powershell
cd backend
.\src\scripts\run-migration.ps1
```

**Option B: Using psql Directly**
```powershell
cd backend
psql -U your_username -d mayhem_creations -f src/scripts/add-shipping-fields.sql
```

Replace `your_username` with your PostgreSQL username.

### Step 2: Verify Migration Succeeded

```powershell
psql -U your_username -d mayhem_creations -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='order_reviews' AND column_name IN ('shipping_address', 'shipping_method', 'customer_notes');"
```

Expected output:
```
    column_name    | data_type
-------------------+-----------
 customer_notes    | text
 shipping_address  | jsonb
 shipping_method   | jsonb
```

### Step 3: Start Backend Server

```powershell
cd backend
npm run dev
```

Server should start on http://localhost:5001

### Step 4: Start Frontend Server

```powershell
cd frontend
npm run dev
```

Frontend should start on http://localhost:5173

---

## Testing the Complete Flow

### Test 1: Basic Checkout Flow

**Steps:**

1. **Navigate to Products Page**
   ```
   URL: http://localhost:5173/products
   ```

2. **Add Items to Cart**
   - Click on any product
   - Click "Add to Cart" or "Customize & Add to Cart"
   - Repeat for 2-3 products

3. **View Cart**
   ```
   URL: http://localhost:5173/cart
   ```
   - Verify items are displayed
   - Check subtotal is correct
   - Notice NEW button: "Proceed to Checkout" (green button)

4. **Click "Proceed to Checkout"**
   - Should navigate to /checkout
   - Should see Step 1: Shipping information form

5. **Fill Shipping Address Form**
   ```
   First Name: John
   Last Name: Doe
   Email: john@example.com
   Phone: (555) 123-4567
   Street Address: 123 Main Street
   Apartment: Apt 4B (optional)
   City: Columbus
   State: OH
   ZIP Code: 43215
   Notes: Leave at front door (optional)
   ```

6. **Click "Continue to Review"**
   - Should show loading screen: "Calculating Shipping..."
   - Should see progress indicators (Checking carrier rates, Validating address)
   - After 2-3 seconds, should move to Step 2

7. **Verify Step 2: Review**
   - Should see "Selected Shipping Method" section with:
     - Service name (e.g., "USPS Priority Mail")
     - Carrier and delivery estimate
     - Cost (e.g., "$9.99")
   - Should see "Order Items" section with all cart items
   - Should see blue notice: "Order Review Process"
   - Should see order summary sidebar with:
     - Subtotal
     - Shipping (actual calculated cost)
     - Tax
     - Total (accurate with shipping)

8. **Click "Submit for Review"**
   - Should show loading screen: "Submitting Order..."
   - Should see success screen: "Order Submitted for Review!"
   - Should show order details with shipping info
   - After 2 seconds, navigate to /my-orders

9. **Verify My Orders Page**
   - Should see newly submitted order with "Pending" status
   - Cart should be empty

### Test 2: Admin Review

**Steps:**

1. **Login as Admin**
   ```
   URL: http://localhost:5173/admin
   ```

2. **Navigate to Order Reviews**
   ```
   Admin Panel → Order Review Management
   ```

3. **Find the New Order**
   - Should see order with "Pending" status
   - Click "View Details"

4. **Verify Shipping Information is Visible**
   - Should see shipping address:
     - John Doe
     - 123 Main Street, Apt 4B
     - Columbus, OH 43215
   - Should see shipping method:
     - USPS Priority Mail
     - Cost: $9.99
     - Estimated delivery: 3 business days
   - Should see customer notes (if provided)

5. **Approve the Order**
   - Click "Approve" button
   - Order status should change to "Approved - Ready for Checkout"

### Test 3: Payment After Approval

**Steps:**

1. **Return to Customer View**
   ```
   URL: http://localhost:5173/my-orders
   ```

2. **Find Approved Order**
   - Should see order with "Approved - Ready for Checkout" status
   - Should have "Proceed to Payment" button

3. **Click "Proceed to Payment"**
   - Should navigate to /order-checkout
   - Shipping address should be PRE-FILLED with saved data
   - Shipping method should be PRE-SELECTED
   - Total should include the shipping cost calculated earlier

4. **Complete Payment**
   - Follow payment flow (Stripe or PayPal)
   - Verify shipping cost is included in final total

---

## Test Scenarios

### Scenario 1: Multiple Shipping Options

**Test:**
- Use a ZIP code far from origin (43055, Newark OH)
- Example: Try Los Angeles, CA 90001
- Should see 3-5 different shipping options (USPS, FedEx, UPS)
- Prices should vary based on speed/carrier

**Expected Result:**
- Cheapest option is recommended by default
- Customer can select any available option
- Selected option shows in review step

### Scenario 2: Invalid Address

**Test:**
- Enter invalid ZIP code: 00000
- Or invalid state: XX

**Expected Result:**
- Should show error: "Failed to calculate shipping rates"
- OR fallback rates are shown with warning

### Scenario 3: API Failure

**Test:**
- Stop backend server temporarily
- Try to calculate shipping

**Expected Result:**
- Should show fallback rates:
  - Standard Shipping: $9.99
  - Express Shipping: $19.99
- Warning message displayed
- Customer can still proceed with estimated rates

### Scenario 4: Change Address in Review

**Test:**
- Complete Step 1 and reach Step 2 (Review)
- Click "Change Address" link
- Modify ZIP code
- Click "Continue to Review" again

**Expected Result:**
- Shipping should recalculate
- New rates shown
- Total updated accordingly

### Scenario 5: Empty Cart Protection

**Test:**
- Navigate directly to /checkout without items in cart

**Expected Result:**
- Should show "Your cart is empty"
- Should redirect to /cart or /products

---

## Verification Checklist

Use this checklist to verify everything works:

### Database
- [ ] Migration ran successfully
- [ ] order_reviews table has shipping_address column (JSONB)
- [ ] order_reviews table has shipping_method column (JSONB)
- [ ] order_reviews table has customer_notes column (TEXT)
- [ ] order_reviews table has shipping_carrier column (VARCHAR)
- [ ] Index idx_order_reviews_shipping_carrier exists

### Frontend - Cart
- [ ] Cart displays "Proceed to Checkout" button (green/accent color)
- [ ] Clicking button navigates to /checkout
- [ ] Cart items are maintained during navigation

### Frontend - Checkout (Step 1)
- [ ] Shipping address form displays all required fields
- [ ] Form validation works (required fields marked)
- [ ] "Continue to Review" button is disabled until form is complete
- [ ] Clicking "Continue" shows loading screen
- [ ] Loading screen shows: "Calculating Shipping..."
- [ ] Progress indicators animate correctly

### Frontend - Checkout (Step 2)
- [ ] Selected shipping method displays correctly
- [ ] Service name, carrier, days, and cost are visible
- [ ] "Change Address" link navigates back to Step 1
- [ ] Order items display with correct prices
- [ ] Order summary shows actual shipping cost
- [ ] Total includes shipping, tax, and subtotal
- [ ] Blue notice about review process is visible
- [ ] "Submit for Review" button is enabled
- [ ] Clicking submit shows loading screen
- [ ] Success screen displays with order details
- [ ] Redirects to /my-orders after 2 seconds

### Backend - Order Submission
- [ ] POST /api/v1/orders/submit-for-review accepts shipping data
- [ ] Validates shipping address (street, city, state, zipCode required)
- [ ] Validates shipping method (must be selected)
- [ ] Stores shipping_address as JSON in database
- [ ] Stores shipping_method as JSON in database
- [ ] Stores customer_notes in database
- [ ] Stores shipping_carrier for indexing
- [ ] Returns shipping info in response
- [ ] WebSocket notification includes shipping details

### Backend - Order Retrieval
- [ ] GET /api/v1/orders/review-orders returns shipping fields
- [ ] GET /api/v1/orders/admin/review-orders includes shipping_method
- [ ] Shipping address is properly formatted
- [ ] Shipping method details are complete

### Admin Panel
- [ ] Order review displays shipping address
- [ ] Shipping method (carrier + service) is visible
- [ ] Shipping cost is included in order total
- [ ] Admin can see delivery estimate
- [ ] Customer notes are visible (if provided)

### Payment Flow
- [ ] OrderCheckout pre-fills shipping address from order
- [ ] Shipping cost is already calculated
- [ ] Customer can verify address before payment
- [ ] Total in payment matches order review total
- [ ] Payment includes correct shipping amount

---

## Expected Console Output

### When Navigating to Checkout

```
📦 Moving from step 1 to step 2, calculating shipping...
🚚 Starting shipping calculation...
🚚 Calculating shipping rates via API... (state should be loading now)
✅ Shipping rates response: { success: true, data: { rates: [...] } }
✅ Selected recommended shipping rate: { serviceName: "USPS Priority Mail", ... }
📦 Shipping calculated, now moving to step 2
```

### When Submitting for Review

```
📦 Starting order submission for review...
📦 Submitting order for review... (loading screen should be visible)
📦 Order submission complete, hiding loading screen
```

### Backend Console

```
🔍 Submit for review request: { userId: 1, itemsCount: 2, ... }
🔍 Shipping information: { 
  shippingAddress: { street: "123 Main St", ... },
  shippingMethod: { carrier: "USPS", ... },
  customerNotes: "Leave at door"
}
🔍 SQL replacements: [ 1, "[...]", 55.00, 9.99, 4.40, 69.39, ... ]
✅ Order review created with ID: 123
📢 Emitted new order notification for order 123
```

---

## Common Issues & Solutions

### Issue: "Cannot read property 'title' of undefined"
**Solution:** Product data might be missing. Check cart items have valid productIds.

### Issue: "Shipping rates not loading"
**Solution:** 
1. Check backend is running
2. Verify ShipEngine API key in backend/.env
3. Check browser console for API errors
4. Verify network tab shows request to /api/v1/shipping/shipengine/rates

### Issue: "Database error: column shipping_address does not exist"
**Solution:** Run the migration script again:
```powershell
psql -U your_username -d mayhem_creations -f backend/src/scripts/add-shipping-fields.sql
```

### Issue: "Form not validating correctly"
**Solution:** Check all required fields are filled:
- First Name
- Last Name
- Email (valid format)
- Phone
- Street Address
- City
- State (2 letters)
- ZIP Code (5 or 9 digits)

### Issue: "Total doesn't include shipping"
**Solution:** Make sure you reach Step 2 (shipping should be calculated in Step 1)

---

## Manual Database Verification

After submitting an order, verify data in database:

```sql
-- Check latest order review
SELECT 
  id,
  user_id,
  subtotal,
  shipping,
  tax,
  total,
  status,
  shipping_address,
  shipping_method,
  customer_notes,
  shipping_carrier
FROM order_reviews 
ORDER BY id DESC 
LIMIT 1;
```

Expected to see:
```
id  | user_id | subtotal | shipping | tax  | total  | status  | shipping_address | shipping_method | customer_notes     | shipping_carrier
----|---------|----------|----------|------|--------|---------|------------------|-----------------|--------------------|-----------------
123 | 1       | 55.00    | 9.99     | 4.40 | 69.39  | pending | {"firstName":... | {"serviceName.. | "Leave at door"    | USPS
```

---

## API Testing (Optional)

Test the backend API directly:

### Test Shipping Rate Calculation

```powershell
# PowerShell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    address = @{
        city = "Columbus"
        state = "OH"
        postalCode = "43215"
    }
    items = @(
        @{
            id = "1"
            name = "Test Product"
            quantity = 1
            price = 25.00
            weight = @{
                value = 8
                unit = "ounce"
            }
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5001/api/v1/shipping/shipengine/rates" -Method Post -Headers $headers -Body $body -UseDefaultCredentials
```

Expected response:
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "serviceName": "USPS Priority Mail",
        "carrier": "USPS",
        "totalCost": 9.99,
        "estimatedDeliveryDays": 3
      },
      ...
    ],
    "recommendedRate": { ... }
  }
}
```

---

## Success Criteria

Your implementation is successful if:

1. ✅ Customer can proceed from cart to checkout
2. ✅ Shipping address form validates correctly
3. ✅ Real shipping rates load from ShipEngine API
4. ✅ Multiple carrier options are displayed
5. ✅ Customer can select shipping method
6. ✅ Order review shows complete details
7. ✅ Shipping cost is included in total
8. ✅ Order submits with shipping information
9. ✅ Admin sees shipping details in review panel
10. ✅ OrderCheckout pre-fills shipping for payment

---

## Quick Test Commands

### Run Full Test Flow
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Browser: Navigate to http://localhost:5173
# 1. Go to /products
# 2. Add items to cart
# 3. Go to /cart
# 4. Click "Proceed to Checkout"
# 5. Fill address form
# 6. Verify shipping rates load
# 7. Review order
# 8. Submit for review
# 9. Check /my-orders shows submitted order
```

### Verify Backend Logs
```powershell
# Watch backend logs in real-time
cd backend
Get-Content logs/combined.log -Wait
```

Look for:
```
Order submitted for review by user 1
Shipping information: { shippingAddress: {...}, shippingMethod: {...} }
Emitted new order notification for order 123
```

---

## Rollback (If Needed)

If you need to rollback the changes:

### Rollback Database
```sql
ALTER TABLE order_reviews 
DROP COLUMN IF EXISTS shipping_address,
DROP COLUMN IF EXISTS shipping_method,
DROP COLUMN IF EXISTS customer_notes,
DROP COLUMN IF EXISTS shipping_carrier,
DROP COLUMN IF EXISTS estimated_delivery_date;

DROP INDEX IF EXISTS idx_order_reviews_shipping_carrier;
```

### Rollback Code
```powershell
git checkout frontend/src/ecommerce/routes/Checkout.tsx
git checkout frontend/src/ecommerce/routes/Cart.tsx
git checkout frontend/src/ecommerce/routes/OrderCheckout.tsx
git checkout backend/src/controllers/orderReviewController.ts
```

---

## Next Steps After Testing

Once basic flow works:

1. **Phase 2 Enhancements** (Week 2)
   - Add product weights to database
   - Implement address validation UI
   - Add shipping zone restrictions
   - Create admin shipping override

2. **Phase 3 Features** (Week 3)
   - Shipping insurance option
   - Free shipping thresholds
   - Multiple shipping addresses
   - Address book for customers

3. **Phase 4 Advanced** (Week 4)
   - International shipping
   - Multi-package handling
   - Label generation
   - Tracking integration

---

## Support

If you encounter issues during testing:

1. Check browser console for errors (F12)
2. Check backend logs: `backend/logs/combined.log`
3. Verify database migration ran successfully
4. Ensure ShipEngine API key is configured
5. Test with different addresses/ZIP codes

---

**Implementation Status:** ✅ Complete and Ready for Testing

**Estimated Test Time:** 15-20 minutes

Good luck! 🚀

