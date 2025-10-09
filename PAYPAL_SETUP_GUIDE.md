# PayPal Payment Integration Setup Guide

This guide explains how to set up PayPal payment integration alongside the existing Stripe integration in the Mayhem Creations application.

## 🚀 Overview

The application now supports both Stripe and PayPal payment methods. Users can choose their preferred payment method during checkout.

## 📋 Prerequisites

- PayPal Developer Account
- PayPal Business Account (for production)
- Backend server running
- Frontend application running

## 🔧 Backend Setup

### 1. Install PayPal SDK

The PayPal SDK is already installed. If you need to reinstall:

```bash
cd backend
npm install @paypal/paypal-server-sdk
```

### 2. Environment Variables

Add the following PayPal environment variables to your `.env` file:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here
PAYPAL_BRAND_NAME=Mayhem Creations
PAYPAL_SUCCESS_URL=http://localhost:5173/payment/success
PAYPAL_CANCEL_URL=http://localhost:5173/payment/cancel
```

### 3. PayPal Developer Account Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal account
3. Create a new application:
   - Choose "Default Application" or "Custom Application"
   - Select "Web" as the platform
   - Choose "Sandbox" for testing or "Live" for production

4. Get your credentials:
   - **Client ID**: Copy from the application overview
   - **Client Secret**: Copy from the application overview
   - **Environment**: Use `sandbox` for testing, `production` for live

### 4. Webhook Setup (Optional but Recommended)

1. In PayPal Developer Dashboard, go to your application
2. Navigate to "Webhooks" section
3. Create a new webhook:
   - **Event Types**: Select relevant events like:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `CHECKOUT.ORDER.APPROVED`
     - `CHECKOUT.ORDER.COMPLETED`
   - **Webhook URL**: `https://yourdomain.com/api/v1/payments/paypal/webhook`
   - **Webhook ID**: Copy this for your environment variables

## 🎨 Frontend Setup

### 1. Environment Variables

Add PayPal environment variables to your frontend `.env` file:

```env
# PayPal Frontend Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here
VITE_PAYPAL_ENVIRONMENT=sandbox
```

### 2. PayPal SDK

The PayPal React SDK is already installed. If you need to reinstall:

```bash
cd frontend
npm install @paypal/react-paypal-js
```

## 🔄 API Endpoints

The following PayPal API endpoints are now available:

### Create PayPal Order
```
POST /api/v1/payments/paypal/create-order
```

**Request Body:**
```json
{
  "amount": 25.99,
  "currency": "USD",
  "description": "Mayhem Creations Order",
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "unitAmount": 25.99,
      "currency": "USD"
    }
  ],
  "metadata": {
    "customerEmail": "customer@example.com",
    "customerName": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "PAYPAL_ORDER_ID",
    "status": "CREATED",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=...",
    "links": [...]
  }
}
```

### Capture PayPal Order
```
POST /api/v1/payments/paypal/capture-order
```

**Request Body:**
```json
{
  "orderId": "PAYPAL_ORDER_ID",
  "metadata": {
    "customerEmail": "customer@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "CAPTURE_ID",
    "status": "COMPLETED",
    "amount": {
      "currency_code": "USD",
      "value": "25.99"
    },
    "payer": {
      "email_address": "customer@example.com",
      "name": {
        "given_name": "John",
        "surname": "Doe"
      }
    }
  }
}
```

### Get PayPal Order Status
```
GET /api/v1/payments/paypal/order/:orderId
```

### PayPal Webhook
```
POST /api/v1/payments/paypal/webhook
```

## 🧪 Testing

### 1. Sandbox Testing

Use PayPal's sandbox environment for testing:

1. **Test Accounts**: PayPal provides test buyer and seller accounts
2. **Test Cards**: Use PayPal's test credit card numbers
3. **Test Flow**: Complete the full payment flow in sandbox mode

### 2. Test Scenarios

Test the following scenarios:

- ✅ Successful PayPal payment
- ✅ PayPal payment cancellation
- ✅ PayPal payment failure
- ✅ Invalid order data
- ✅ Network errors
- ✅ Authentication errors

### 3. PayPal Test Cards

For testing with PayPal's hosted checkout:

- **Successful Payment**: Use any valid test card
- **Declined Payment**: Use PayPal's test decline scenarios
- **3D Secure**: Test with cards requiring additional authentication

## 🔒 Security Considerations

### 1. Environment Variables

- Never commit real PayPal credentials to version control
- Use different credentials for development and production
- Rotate credentials regularly

### 2. Webhook Security

- Implement proper webhook signature verification
- Use HTTPS for webhook endpoints
- Validate webhook payloads

### 3. Data Handling

- Don't store sensitive payment data
- Use PayPal's secure token system
- Implement proper error handling

## 🚀 Production Deployment

### 1. Switch to Production Environment

Update environment variables:

```env
PAYPAL_ENVIRONMENT=production
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
VITE_PAYPAL_ENVIRONMENT=production
VITE_PAYPAL_CLIENT_ID=your_live_client_id
```

### 2. Update URLs

Update success and cancel URLs to production domains:

```env
PAYPAL_SUCCESS_URL=https://yourdomain.com/payment/success
PAYPAL_CANCEL_URL=https://yourdomain.com/payment/cancel
```

### 3. Webhook Configuration

- Update webhook URL to production domain
- Ensure webhook endpoint is accessible
- Test webhook delivery

## 🐛 Troubleshooting

### Common Issues

1. **"PayPal service not initialized"**
   - Check PayPal client ID configuration
   - Verify environment variables are set

2. **"Failed to create PayPal order"**
   - Check backend PayPal credentials
   - Verify API endpoint is accessible
   - Check request payload format

3. **"Payment capture failed"**
   - Verify order ID is valid
   - Check PayPal order status
   - Ensure proper authentication

4. **Webhook not receiving events**
   - Verify webhook URL is accessible
   - Check webhook configuration in PayPal dashboard
   - Test webhook endpoint manually

### Debug Mode

Enable debug logging:

```typescript
// In PayPal service
console.log('PayPal configuration:', paypalConfig);
console.log('Order creation request:', orderData);
console.log('Order creation response:', result);
```

## 📚 Additional Resources

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Orders API](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal Webhooks](https://developer.paypal.com/docs/api/webhooks/)
- [PayPal React SDK](https://www.npmjs.com/package/@paypal/react-paypal-js)

## ✅ Checklist

- [ ] PayPal Developer Account created
- [ ] PayPal application created
- [ ] Environment variables configured
- [ ] Backend PayPal service implemented
- [ ] Frontend PayPal integration working
- [ ] Test payments successful
- [ ] Webhook configured (optional)
- [ ] Production credentials ready
- [ ] Security measures implemented

## 🎉 Success!

Once all steps are completed, users will be able to:

1. Choose between Stripe and PayPal during checkout
2. Complete payments using their PayPal account
3. Receive payment confirmations
4. Have their orders processed automatically

The integration maintains the existing Stripe functionality while adding PayPal as an additional payment option.
