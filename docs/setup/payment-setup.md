# Payment Integration Setup Guide

This guide will help you set up Stripe and PayPal payment processing for your ecommerce application.

## Prerequisites

- Stripe account (https://stripe.com)
- PayPal Developer account (https://developer.paypal.com)
- Node.js and npm installed

## 1. Stripe Setup

### Step 1: Create a Stripe Account
1. Go to https://stripe.com and create an account
2. Complete the account verification process
3. Access your Stripe Dashboard

### Step 2: Get API Keys
1. In your Stripe Dashboard, go to "Developers" > "API keys"
2. Copy your **Publishable key** (starts with `pk_test_` for test mode)
3. Copy your **Secret key** (starts with `sk_test_` for test mode)

### Step 3: Configure Environment Variables
Create a `.env` file in the frontend directory with:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key_here
VITE_STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key_here
```

## 2. PayPal Setup

### Step 1: Create a PayPal Developer Account
1. Go to https://developer.paypal.com
2. Sign in with your PayPal account or create one
3. Complete the developer account setup

### Step 2: Create a PayPal App
1. In the PayPal Developer Dashboard, go to "My Apps & Credentials"
2. Click "Create App"
3. Choose "Default Application" or "Custom Application"
4. Select "Sandbox" for testing
5. Copy the **Client ID** from your app

### Step 3: Configure Environment Variables
Add to your `.env` file:

```env
VITE_PAYPAL_CLIENT_ID=your_actual_paypal_client_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox
```

## 3. Complete Environment Configuration

Your complete `.env` file should look like this:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...your_actual_key
VITE_STRIPE_SECRET_KEY=sk_test_51ABC123...your_actual_key

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=ABC123...your_actual_client_id
VITE_PAYPAL_ENVIRONMENT=sandbox

# Other Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=Mayhem Creations
VITE_APP_VERSION=1.0.0
```

## 4. Testing

### Stripe Testing
- Use test card numbers from https://stripe.com/docs/testing
- Common test cards:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`
  - Requires authentication: `4000 0025 0000 3155`

### PayPal Testing
- Use PayPal Sandbox accounts for testing
- Create test accounts in your PayPal Developer Dashboard
- Test with different scenarios (success, failure, cancellation)

## 5. Production Setup

### Stripe Production
1. Switch to live mode in Stripe Dashboard
2. Get your live API keys (starts with `pk_live_` and `sk_live_`)
3. Update environment variables
4. Set `VITE_PAYPAL_ENVIRONMENT=production`

### PayPal Production
1. Create a live app in PayPal Developer Dashboard
2. Get your live Client ID
3. Update environment variables
4. Set `VITE_PAYPAL_ENVIRONMENT=production`

## 6. Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive data
- The secret key should only be used on the backend
- Always use HTTPS in production
- Regularly rotate your API keys

## 7. Troubleshooting

### Common Issues

1. **"Stripe not configured" error**
   - Check that your environment variables are set correctly
   - Restart your development server after changing `.env`

2. **PayPal button not loading**
   - Verify your Client ID is correct
   - Check that the environment is set to 'sandbox' or 'production'

3. **Payment processing fails**
   - Check browser console for error messages
   - Verify API keys are valid and active
   - Ensure you're using test data in sandbox mode

### Getting Help

- Stripe Documentation: https://stripe.com/docs
- PayPal Documentation: https://developer.paypal.com/docs
- Check the browser console for detailed error messages

## 8. Features Included

✅ Stripe card payment processing
✅ PayPal payment button integration
✅ Payment validation and error handling
✅ Secure payment form components
✅ Order processing with payment results
✅ Payment method selection
✅ Real-time payment status updates

## 9. Next Steps

1. Set up your API keys following the steps above
2. Test payments in sandbox mode
3. Customize the payment UI to match your brand
4. Set up webhook handling for payment confirmations
5. Implement order management in your backend
6. Set up production accounts when ready to go live
