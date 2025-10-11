# Orders System Setup Guide

## Overview

This guide explains how to set up and test the complete order management system that creates orders in the admin panel after successful payment transactions.

## System Architecture

### Flow Diagram

```
Customer Customizes Product → Submits for Review (order_reviews table)
         ↓
Admin Reviews & Approves → Customer Proceeds to Checkout
         ↓
Customer Completes Payment → Stripe Webhook Triggered
         ↓
Webhook Handler → Creates Order (orders table)
         ↓
Order Appears in Admin Orders Section with "Preparing" Status
```

## Database Tables

### 1. `order_reviews` (Pre-Payment)
- Stores customer orders submitted for design review
- Status: `pending`, `needs-changes`, `pending-payment`, `approved-processing`, etc.
- Contains: order data (JSON), pricing, user_id, etc.

### 2. `orders` (Post-Payment)
- Stores actual orders after successful payment
- Status: `pending`, `preparing`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`
- Contains: full order details, shipping address, payment info, tracking, etc.

### 3. `payments` (Payment Records)
- Stores payment transaction records
- Linked to orders via `orderId`
- Contains: transaction IDs, fees, net amounts, payment provider details

## Setup Instructions

### Step 1: Create Orders Table

Run the orders table creation script:

```bash
cd backend
npx ts-node src/scripts/createOrdersTable.ts
```

This will:
- Create the `orders` table with all necessary columns
- Create indexes for optimal query performance
- Display the table structure for verification

### Step 2: Verify Backend Routes

The following routes have been set up:

#### Admin Orders Routes (`/api/v1/admin/orders`)
- `GET /api/v1/admin/orders` - Get all orders (with filters and pagination)
- `GET /api/v1/admin/orders/:id` - Get single order by ID
- `PATCH /api/v1/admin/orders/:id/status` - Update order status

These routes are registered in `backend/src/app.ts` and require admin authentication.

### Step 3: Start Services

1. **Start Backend Server:**
```bash
cd backend
npm run dev
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Start Stripe Webhook Listener (Test Mode):**
```bash
stripe listen --forward-to localhost:5001/api/v1/payments/webhook
```

**Note:** Copy the webhook signing secret that appears in the console output.

4. **Update Environment Variable:**
Add the webhook signing secret to `backend/.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

## Testing the Complete Flow

### Test Scenario: Custom Embroidery Order

Follow these steps to test the complete payment to orders flow:

#### 1. Login as Customer
- Email: `customer1@example.com`
- Password: `customer123`

#### 2. Create Custom Order
1. Navigate to a product (e.g., "Snapback Cap")
2. Customize the product:
   - Step 1: Select color and size
   - Step 2: Upload a design image
   - Step 3: Position the design on the product
   - Step 4: Select embroidery options (coverage, material, border, etc.)
   - Step 5: Review and add to cart

#### 3. Submit for Review
1. Go to Cart
2. Click "Submit for Review"
3. Verify the order appears in "My Orders" > "Pending Review" tab

#### 4. Admin Reviews Order
1. Logout and login as Admin:
   - Email: `admin@example.com`
   - Password: `admin123`
2. Navigate to Admin Panel > "Pending Review"
3. Upload design samples for the customer
4. Approve the order (status changes to `pending-payment`)

#### 5. Customer Confirms and Pays
1. Logout and login as Customer again
2. Go to "My Orders" > "Pending Review"
3. Confirm the design samples
4. Click "Proceed to Checkout"
5. Enter shipping information
6. Complete payment with test card:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

#### 6. Verify Webhook Processing
After successful payment, check the Stripe webhook listener terminal:
- You should see `payment_intent.succeeded` or `checkout.session.completed` event
- The webhook handler will:
  1. Update `order_reviews` status to `approved-processing`
  2. Create a payment record in `payments` table
  3. Create an order record in `orders` table

#### 7. Verify Order in Admin Panel
1. Login as Admin
2. Navigate to Admin Panel > "Orders"
3. You should see the new order with:
   - Status: **Preparing** (teal badge)
   - Order Number: `ORD-{timestamp}-{review_id}`
   - Customer details
   - Shipping address
   - Product details with customization
   - Payment information (payment provider, card last 4, etc.)

## Order Fields Explained

### Order Record Structure

```typescript
{
  id: number,                    // Auto-generated order ID
  orderNumber: string,           // Human-readable order number (e.g., ORD-1760000000-1)
  userId: number,                // Customer user ID
  orderReviewId: number,         // Reference to original order_review
  
  // Items
  items: JSON,                   // Array of order items with customization
  
  // Pricing
  subtotal: decimal(10,2),       // Subtotal before shipping/tax
  shipping: decimal(10,2),       // Shipping cost
  tax: decimal(10,2),            // Tax amount
  total: decimal(10,2),          // Total order amount
  
  // Shipping Address (JSON)
  shippingAddress: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  
  // Payment Details
  paymentMethod: string,         // e.g., 'card'
  paymentStatus: enum,           // 'completed', 'pending', etc.
  paymentProvider: enum,         // 'stripe', 'paypal', etc.
  paymentIntentId: string,       // Stripe payment intent ID
  transactionId: string,         // Transaction reference
  cardLast4: string,             // Last 4 digits of card
  cardBrand: string,             // Card brand (Visa, Mastercard, etc.)
  
  // Order Status
  status: enum,                  // 'preparing', 'processing', 'shipped', etc.
  
  // Fulfillment
  trackingNumber: string,        // Shipping tracking number (optional)
  shippingCarrier: string,       // Carrier name (optional)
  shippedAt: datetime,           // Shipped timestamp (optional)
  deliveredAt: datetime,         // Delivered timestamp (optional)
  
  // Notes
  customerNotes: text,           // Customer notes (optional)
  adminNotes: text,              // Admin notes (optional)
  
  // Timestamps
  createdAt: datetime,           // Order creation time
  updatedAt: datetime            // Last update time
}
```

## API Endpoints

### Get All Orders (Admin)
```
GET /api/v1/admin/orders?page=1&limit=50&status=preparing
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `status`: Filter by order status (optional)
- `paymentStatus`: Filter by payment status (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-1760000000-1",
      "userId": 2,
      "status": "preparing",
      "total": 125.50,
      "shippingAddress": { ... },
      "items": [ ... ],
      ...
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 50
  }
}
```

### Get Order by ID (Admin)
```
GET /api/v1/admin/orders/:id
```

### Update Order Status (Admin)
```
PATCH /api/v1/admin/orders/:id/status
```

**Request Body:**
```json
{
  "status": "processing",
  "adminNotes": "Order being processed",
  "trackingNumber": "1Z999AA10123456784",
  "shippingCarrier": "UPS"
}
```

## Webhook Integration

### Payment Success Flow

When a payment succeeds, the Stripe webhook (`payment_intent.succeeded` or `checkout.session.completed`) triggers the following actions:

1. **Update Order Review:**
   - Status changes to `approved-processing`
   - `reviewed_at` timestamp is set

2. **Create Payment Record:**
   - Transaction details stored
   - Stripe fees calculated and logged
   - Net amount computed

3. **Create Order:**
   - `createOrderFromReview()` function is called
   - Order record created with status `preparing`
   - Shipping details extracted from payment metadata
   - Order number generated: `ORD-{timestamp}-{review_id}`

### Webhook Handler Code Flow

```typescript
// In webhookController.ts
handlePaymentIntentSucceeded(paymentIntent) {
  // 1. Find order_review with status 'pending-payment'
  // 2. Update order_review status to 'approved-processing'
  // 3. Create payment record
  // 4. Create order record
  //    - Extract shipping details from metadata
  //    - Call createOrderFromReview()
  //    - Set status to 'preparing'
}
```

## Admin Panel Features

### Orders Page
- **Filter by Status:** `All`, `Pending`, `Preparing`, `Processing`, `Shipped`, `Delivered`, `Cancelled`
- **Search:** By order number, customer name, or email
- **Pagination:** Navigate through large order lists
- **Order Details:** View full order information including:
  - Customer details
  - Shipping address
  - Product items with customization
  - Payment information
  - Order timeline

### Order Status Management
Admins can update order status from the Orders page:
- `Preparing` → Initial status after payment
- `Processing` → Order is being manufactured
- `Shipped` → Order has been shipped (tracking number required)
- `Delivered` → Order delivered to customer
- `Cancelled` → Order cancelled

## Troubleshooting

### Order Not Appearing in Admin Panel

**Check 1: Webhook Triggered**
```bash
# In stripe webhook listener terminal
# Should see: payment_intent.succeeded or checkout.session.completed
```

**Check 2: Order Created**
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

**Check 3: Backend Logs**
```bash
# Check backend console for:
# ✅ Payment successful and order approved for processing
# ✅ Order created successfully from payment
```

**Check 4: Frontend API Call**
```javascript
// Open browser console, check Network tab
// Should see: GET /api/v1/admin/orders (Status: 200)
```

### Shipping Details Not Populated

The webhook extracts shipping details from payment metadata. Ensure your payment intent/checkout session includes these metadata fields:
- `firstName`
- `lastName`
- `email` (or `customerEmail`)
- `phone`
- `street`
- `city`
- `state`
- `zipCode`
- `country`

### Order Status Not Updating

Check that the admin has proper role permissions:
```sql
SELECT u.email, u.role_id, r.name as role_name 
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.email = 'admin@example.com';
```

Role should be `admin` with ID 1.

## Production Deployment

### 1. Environment Variables
Ensure the following are set in production:
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
DATABASE_URL=your_production_db_url
```

### 2. Webhook Endpoint
Register your production webhook endpoint in Stripe Dashboard:
```
https://yourdomain.com/api/v1/payments/webhook
```

### 3. Events to Listen
Enable these webhook events in Stripe:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `checkout.session.completed`
- `checkout.session.expired`

## Support

For issues or questions:
1. Check the backend console logs
2. Check the Stripe webhook logs
3. Verify database tables are created
4. Ensure proper authentication tokens
5. Review API responses in browser Network tab

## Summary

The complete order flow is now integrated:
1. ✅ Customer customizes and submits order for review
2. ✅ Admin reviews and approves
3. ✅ Customer completes payment via Stripe
4. ✅ Webhook creates order record with status "Preparing"
5. ✅ Order appears in Admin Orders section with full details
6. ✅ Admin can manage order status, add tracking, etc.

Happy order management! 🎉

