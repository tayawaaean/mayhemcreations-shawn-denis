# 🚀 Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payment processing for both backend and frontend in test mode.

## 📋 Prerequisites

- Stripe account (free to create)
- Node.js and npm installed
- Backend and frontend projects set up

## 🔧 Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install stripe @types/stripe
```

### 2. Environment Variables
Add these to your `backend/.env` file (create it if it doesn't exist):

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_SUCCESS_URL=http://localhost:3000/payment/success
STRIPE_CANCEL_URL=http://localhost:3000/payment/cancel
```

### 3. Backend Files Created
- `src/config/stripe.ts` - Stripe configuration
- `src/services/stripeService.ts` - Payment operations
- `src/controllers/paymentController.ts` - API endpoints
- `src/routes/paymentRoute.ts` - Payment routes

### 4. API Endpoints Available
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/create-checkout-session` - Create checkout session
- `GET /api/v1/payments/intent/:id` - Get payment intent status
- `GET /api/v1/payments/session/:id` - Get checkout session status
- `POST /api/v1/payments/customer` - Create/retrieve customer

## 🎨 Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Environment Variables
Add these to your `frontend/.env.development` file (I've created a template for you):

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 3. Frontend Files Created
- `src/config/stripe.ts` - Stripe configuration
- `src/services/stripeService.ts` - API communication
- `src/components/StripePaymentForm.tsx` - Payment form component
- `src/components/StripeCheckoutButton.tsx` - Checkout button component
- `src/pages/PaymentSuccess.tsx` - Success page
- `src/pages/PaymentCancel.tsx` - Cancel page
- `src/components/StripeExample.tsx` - Example usage

### 4. Routes Added
- `/payment/success` - Payment success page
- `/payment/cancel` - Payment cancel page

## 🔑 Getting Your Stripe Keys

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete account verification

### 2. Get Test Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click "Developers" → "API keys"
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 3. Set Up Webhook (Optional)
1. Go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. URL: `http://localhost:3001/api/v1/payments/webhook`
4. Select events: `payment_intent.succeeded`, `checkout.session.completed`
5. Copy the webhook secret (starts with `whsec_`)

## 🧪 Testing

### 1. Test Card Numbers
Use these test card numbers:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Visa (successful) |
| `4000 0000 0000 0002` | Visa (declined) |
| `4000 0000 0000 9995` | Visa (insufficient funds) |
| `4000 0000 0000 9987` | Visa (expired card) |

**Test Details:**
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)
- Use any billing address

### 2. Start the Applications
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 3. Test Payment Flow
1. Navigate to `http://localhost:3000`
2. Add items to cart
3. Go to checkout
4. Use test card numbers
5. Complete payment

## 📱 Usage Examples

### Payment Form Component
```tsx
import StripePaymentForm from './components/StripePaymentForm';

<StripePaymentForm
  amount={25.99}
  description="Test payment"
  onSuccess={(paymentIntent) => {
    console.log('Payment successful:', paymentIntent);
  }}
  onError={(error) => {
    console.error('Payment failed:', error);
  }}
/>
```

### Checkout Button Component
```tsx
import StripeCheckoutButton from './components/StripeCheckoutButton';

<StripeCheckoutButton
  lineItems={[
    {
      name: 'Product Name',
      description: 'Product description',
      price: 25.99,
      quantity: 1,
      images: ['https://example.com/image.jpg']
    }
  ]}
  successUrl="http://localhost:3000/payment/success"
  cancelUrl="http://localhost:3000/payment/cancel"
>
  Pay with Stripe
</StripeCheckoutButton>
```

## 🔒 Security Notes

### Backend Security
- Never expose secret keys in frontend code
- Always validate payment amounts on backend
- Use HTTPS in production
- Implement proper error handling

### Frontend Security
- Only use publishable keys in frontend
- Validate user input before sending to backend
- Handle payment errors gracefully
- Never store sensitive payment data

## 🚀 Production Deployment

### 1. Switch to Live Mode
1. Get live keys from Stripe Dashboard
2. Update environment variables
3. Change `testMode: false` in config

### 2. Update URLs
```env
STRIPE_SUCCESS_URL=https://yourdomain.com/payment/success
STRIPE_CANCEL_URL=https://yourdomain.com/payment/cancel
```

### 3. Webhook Configuration
- Update webhook URL to production domain
- Use HTTPS endpoints
- Test webhook delivery

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check if keys are correct
   - Ensure you're using test keys in test mode

2. **CORS errors**
   - Check backend CORS configuration
   - Ensure frontend URL is allowed

3. **Payment fails silently**
   - Check browser console for errors
   - Verify backend logs
   - Check Stripe Dashboard for failed payments

4. **Webhook not receiving events**
   - Verify webhook URL is accessible
   - Check webhook secret is correct
   - Test with Stripe CLI

### Debug Mode
Enable debug logging in backend:
```typescript
// In stripeService.ts
console.log('Stripe request:', data);
console.log('Stripe response:', result);
```

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Components](https://stripe.com/docs/stripe-js/react)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

## ✅ Checklist

- [ ] Stripe account created
- [ ] Test keys obtained
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Backend `.env` file configured
- [ ] Frontend `.env.development` file configured
- [ ] Backend running on port 5001
- [ ] Frontend running on port 3000
- [ ] Test payment successful
- [ ] Error handling working
- [ ] Success/cancel pages working
- [ ] Webhook endpoint working
- [ ] Test suite accessible at `/stripe-test`

## 🧪 Testing

### **Quick Test**
1. Navigate to `http://localhost:3000/stripe-test`
2. Select a test card (e.g., `4242424242424242` for success)
3. Enter any future expiry date and 3-digit CVC
4. Click "Test Payment"
5. Verify the result

### **Comprehensive Testing**
See [STRIPE_TESTING_GUIDE.md](./STRIPE_TESTING_GUIDE.md) for detailed testing scenarios and test cards.

### **Test Cards**
- **Success:** `4242424242424242` (Visa)
- **Decline:** `4000000000000002` (Visa)
- **Insufficient Funds:** `4000000000009995` (Visa)
- **Expired Card:** `4000000000000069` (Visa)
- **Incorrect CVC:** `4000000000000127` (Visa)

## 🎉 You're Ready!

Your Stripe integration is now set up and ready for testing. Use the test card numbers to verify everything works correctly before moving to production.
