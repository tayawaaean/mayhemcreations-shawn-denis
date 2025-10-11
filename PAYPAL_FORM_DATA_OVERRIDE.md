# PayPal Form Data Override Implementation

## Overview
Configured PayPal checkout to use the customer's form data (name, email, phone) instead of their registered PayPal account information, ensuring consistency across all orders.

## Problem Solved

### Before:
- ❌ PayPal checkout showed registered PayPal account name (e.g., "Test User")
- ❌ PayPal email (e.g., sb-xxxxx@personal.example.com) appeared in admin panel
- ❌ Customer's actual information from the form was ignored by PayPal

### After:
- ✅ PayPal checkout displays form name (e.g., "John Doe")
- ✅ Admin panel shows clean shipping address without PayPal email
- ✅ Consistent customer information across Stripe and PayPal payments
- ✅ Form data takes priority over PayPal account data

## Changes Made

### 1. **PayPal Service** (`backend/src/services/paypalService.ts`)

#### Added Payer Information Override
```typescript
// Split customer name into first and last name
const nameParts = (data.customerName || 'Customer').trim().split(' ');
const firstName = nameParts[0] || 'Customer';
const lastName = nameParts.slice(1).join(' ') || '';

const requestBody: any = {
  intent: 'CAPTURE',
  payer: {
    // Override PayPal account info with form data
    name: {
      given_name: firstName,
      surname: lastName || 'Customer'
    },
    email_address: data.customerEmail,
    phone: data.customerPhone ? {
      phone_type: 'MOBILE',
      phone_number: {
        national_number: data.customerPhone.replace(/\D/g, '')
      }
    } : undefined
  },
  // ... rest of order
};
```

**What this does:**
- 🔑 Overrides PayPal account name with form name
- 🔑 Overrides PayPal account email with form email
- 🔑 Adds phone number from form
- 🔑 PayPal checkout displays this information instead of account details

### 2. **PayPal Controller** (`backend/src/controllers/paypalController.ts`)

#### Removed Email from Shipping Address Object
```typescript
// Before:
const shippingAddress = {
  firstName: '...',
  lastName: '...',
  email: 'sb-xxxxx@personal.example.com',  // ❌ PayPal sandbox email
  phone: '...',
  street: '...',
  // ...
};

// After:
const shippingAddress = {
  firstName: '...',
  lastName: '...',
  // email removed - stored separately in order_reviews.user_email ✅
  phone: '...',
  street: '...',
  // ...
};
```

**Why this matters:**
- Email is already stored in `order_reviews.user_email` field
- No need to duplicate it in the address JSON object
- Keeps shipping address clean and focused on physical location

### 3. **Stripe Webhook** (`backend/src/controllers/webhookController.ts`)

#### Removed Email for Consistency (2 locations)
```typescript
// Payment Intent Success Handler
const shippingDetails = {
  firstName: paymentIntent.metadata?.firstName || '',
  lastName: paymentIntent.metadata?.lastName || '',
  // email removed for consistency ✅
  phone: paymentIntent.metadata?.phone || '',
  // ...
};

// Checkout Session Completed Handler
const shippingDetails = {
  firstName: session.metadata?.firstName || '',
  lastName: session.metadata?.lastName || '',
  // email removed for consistency ✅
  phone: session.metadata?.phone || '',
  // ...
};
```

### 4. **Admin Panel** (`frontend/src/admin/pages/PendingReview.tsx`)

#### Updated Shipping Address Display
```typescript
// Before:
<div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
  <div className="text-base text-gray-900 space-y-1">
    <p className="font-medium">{address.firstName} {address.lastName}</p>
    {address.phone && <p>{address.phone}</p>}
    {address.email && <p className="text-sm text-gray-600">{address.email}</p>}  ❌
    <p>{address.street}</p>
    // ...
  </div>
</div>

// After:
<div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
  <div className="text-base text-gray-900 space-y-1">
    <p className="font-medium">{address.firstName} {address.lastName}</p>
    {address.phone && <p className="text-sm text-gray-600">📞 {address.phone}</p>}  ✅
    {/* email removed from display */}
    <p>{address.street}</p>
    {address.apartment && <p className="text-sm text-gray-500">{address.apartment}</p>}
    <p>{address.city}, {address.state} {address.zipCode}</p>
    <p className="font-medium">{address.country}</p>
  </div>
</div>
```

## Admin Panel Display (After)

### Clean Shipping Address:
```
Shipping Address     [Verified by Customer ✓]

John Doe
📞 1234567890
500 Boylston Street Copley Square, near Trinity Church
Boston, MA 21161
US

This is the shipping address provided by the customer during checkout...
```

## PayPal Checkout Experience

### Customer sees in PayPal:
```
Payer Information:
  Name: John Doe                    ← From form
  Email: customer@example.com       ← From form
  Phone: (123) 456-7890            ← From form

Shipping Address:
  John Doe
  500 Boylston Street Copley Square, near Trinity Church
  Boston, MA 21161
  US

  [Pre-filled and locked - cannot be changed]
```

## Benefits

✅ **Consistency**: Same customer info for both Stripe and PayPal orders
✅ **Professional**: No PayPal sandbox emails in admin panel
✅ **Accurate**: Uses the information customer provided in your form
✅ **Clean Data**: Shipping address focused on location, not contact details
✅ **Better UX**: Customer sees their own name/email in PayPal checkout
✅ **Fewer Errors**: No confusion between PayPal account and order details

## Data Storage

### Where Customer Information is Stored:

| Field | Storage Location | Source |
|-------|-----------------|--------|
| First Name | `order_reviews.first_name` | Form |
| Last Name | `order_reviews.last_name` | Form |
| Email | `order_reviews.user_email` | Form |
| Phone | `shipping_address.phone` (JSON) | Form |
| Full Address | `order_reviews.shipping_address` (JSON) | Form |

### Shipping Address JSON Structure:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890",
  "street": "500 Boylston Street Copley Square, near Trinity Church",
  "apartment": "",
  "city": "Boston",
  "state": "MA",
  "zipCode": "21161",
  "country": "US"
}
```

## Testing Checklist

1. ✅ Fill out checkout form with test data
2. ✅ Select PayPal payment method
3. ✅ Click "Place Order"
4. ✅ Verify PayPal shows form name (not "Test User")
5. ✅ Verify PayPal shows form email (not sandbox email)
6. ✅ Complete payment
7. ✅ Check admin panel - verify no PayPal email in address
8. ✅ Verify clean, professional address display
9. ✅ Compare with Stripe orders - should look identical

## Notes

- The `payer` object in PayPal API overrides account information
- `shipping_preference: 'SET_PROVIDED_ADDRESS'` locks the address
- Email is intentionally removed from address object to avoid duplication
- Phone number is formatted (non-numeric characters stripped) for PayPal
- Both Stripe and PayPal now use identical address format for consistency

