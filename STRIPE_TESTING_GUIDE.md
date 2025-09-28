# 🧪 Stripe Testing Guide

This guide covers comprehensive testing of your Stripe integration using test cards and scenarios.

## 🚀 Quick Start

1. **Start your backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start your frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the test suite:**
   - Navigate to `http://localhost:3000/stripe-test`
   - Or use the individual components in your app

## 🧪 Test Cards by Category

### ✅ **Success Cards**
These cards should result in successful payments:

| Card Number | Brand | Description |
|-------------|-------|-------------|
| `4242424242424242` | Visa | Standard successful payment |
| `5555555555554444` | Mastercard | Standard successful payment |
| `378282246310005` | American Express | Standard successful payment |
| `6011111111111117` | Discover | Standard successful payment |
| `4000002500003155` | Visa | Authenticate unless set up |
| `4000003800000446` | Visa | Already set up for off-session |

### ❌ **Decline Cards**
These cards should be declined for various reasons:

| Card Number | Brand | Error Code | Description |
|-------------|-------|------------|-------------|
| `4000000000000002` | Visa | `card_declined` | Generic decline |
| `4000000000009995` | Visa | `card_declined` | Insufficient funds |
| `4000000000009987` | Visa | `card_declined` | Lost card |
| `4000000000009979` | Visa | `card_declined` | Stolen card |
| `4000000000000341` | Visa | `card_declined` | Decline after attaching |

### ⚠️ **Error Cards**
These cards should fail with specific errors:

| Card Number | Brand | Error Code | Description |
|-------------|-------|------------|-------------|
| `4000000000000069` | Visa | `expired_card` | Expired card |
| `4000000000000127` | Visa | `incorrect_cvc` | Incorrect CVC |
| `4000000000000119` | Visa | `processing_error` | Processing error |
| `4242424242424241` | Visa | `incorrect_number` | Incorrect number |

### 🛡️ **Fraud Prevention Cards**
These cards should be blocked by Stripe Radar:

| Card Number | Brand | Description |
|-------------|-------|-------------|
| `4100000000000019` | Visa | Always blocked by Radar |
| `4000000000004954` | Visa | Highest risk (might be blocked) |
| `4000000000009235` | Visa | Elevated risk |
| `4000000000000101` | Visa | CVC check fails |
| `4000000000000036` | Visa | Postal code check fails |

### 🔐 **3D Secure Cards**
These cards require 3D Secure authentication:

| Card Number | Brand | Description |
|-------------|-------|-------------|
| `4000000000003220` | Visa | 3D Secure required (OK) |
| `4000008400001629` | Visa | 3D Secure required (declined) |
| `4000000000003055` | Visa | 3D Secure supported (OK) |
| `4000000000003097` | Visa | 3D Secure supported (error) |

## 🧪 Testing Scenarios

### **1. Basic Payment Flow**
1. Use `4242424242424242` (Visa success)
2. Enter any future expiry date (e.g., 12/25)
3. Enter any 3-digit CVC (e.g., 123)
4. Submit payment
5. **Expected:** Payment succeeds

### **2. Error Handling**
1. Use `4000000000000002` (Generic decline)
2. Enter card details
3. Submit payment
4. **Expected:** Payment fails with "Your card was declined" message

### **3. Insufficient Funds**
1. Use `4000000000009995` (Insufficient funds)
2. Enter card details
3. Submit payment
4. **Expected:** Payment fails with "Your card has insufficient funds" message

### **4. Expired Card**
1. Use `4000000000000069` (Expired card)
2. Enter card details
3. Submit payment
4. **Expected:** Payment fails with "Your card has expired" message

### **5. Incorrect CVC**
1. Use `4000000000000127` (Incorrect CVC)
2. Enter card details
3. Submit payment
4. **Expected:** Payment fails with "Your card's security code is incorrect" message

### **6. Fraud Prevention**
1. Use `4100000000000019` (Always blocked)
2. Enter card details
3. Submit payment
4. **Expected:** Payment fails with fraud-related error message

## 🔧 **Testing with Stripe CLI**

### **1. Install Stripe CLI**
Download from: https://stripe.com/docs/stripe-cli

### **2. Login to Stripe**
```bash
stripe login
```

### **3. Forward Webhooks**
```bash
stripe listen --forward-to localhost:5001/api/v1/payments/webhook
```

### **4. Test Webhook Events**
```bash
# Test payment succeeded
stripe trigger payment_intent.succeeded

# Test payment failed
stripe trigger payment_intent.payment_failed

# Test checkout session completed
stripe trigger checkout.session.completed
```

## 📊 **Testing Checklist**

### **Backend Testing**
- [ ] Payment intent creation works
- [ ] Webhook signature verification works
- [ ] Error handling for declined payments
- [ ] Database updates on successful payments
- [ ] Logging for all payment events

### **Frontend Testing**
- [ ] Payment form renders correctly
- [ ] Card validation works
- [ ] Error messages display properly
- [ ] Success page redirects work
- [ ] Loading states work correctly

### **Integration Testing**
- [ ] End-to-end payment flow works
- [ ] Webhook events are received
- [ ] Database is updated correctly
- [ ] Error scenarios are handled gracefully
- [ ] Success scenarios work completely

## 🚨 **Common Issues & Solutions**

### **Issue: "Your card was declined"**
- **Cause:** Using a decline test card
- **Solution:** Use a success test card like `4242424242424242`

### **Issue: "Invalid API key"**
- **Cause:** Using live keys in test mode or vice versa
- **Solution:** Ensure you're using test keys (`sk_test_` and `pk_test_`)

### **Issue: "Webhook signature verification failed"**
- **Cause:** Incorrect webhook secret or raw body parsing
- **Solution:** Check webhook secret and ensure raw body is parsed correctly

### **Issue: "Payment method not supported"**
- **Cause:** Payment method not enabled in Stripe Dashboard
- **Solution:** Enable the payment method in your Stripe Dashboard

## 📝 **Test Data**

### **Valid Test Details**
- **Expiry Date:** Any future date (e.g., 12/25, 01/26)
- **CVC:** Any 3-digit number (e.g., 123, 456)
- **Billing Address:** Any valid address
- **Email:** Any valid email format

### **Invalid Test Details**
- **Expiry Date:** Past dates (e.g., 01/20)
- **CVC:** 2-digit numbers (e.g., 12)
- **Card Number:** Real card numbers (never use these!)

## 🔍 **Debugging Tips**

1. **Check Browser Console:** Look for JavaScript errors
2. **Check Network Tab:** Verify API calls are being made
3. **Check Backend Logs:** Look for server-side errors
4. **Check Stripe Dashboard:** Verify events are being received
5. **Use Stripe CLI:** Monitor webhook events in real-time

## 📚 **Additional Resources**

- [Stripe Testing Documentation](https://docs.stripe.com/testing)
- [Stripe CLI Documentation](https://docs.stripe.com/stripe-cli)
- [Stripe Webhooks Guide](https://docs.stripe.com/webhooks)
- [Stripe Error Codes](https://docs.stripe.com/error-codes)

## 🎯 **Next Steps**

1. Test all success scenarios
2. Test all error scenarios
3. Test webhook handling
4. Test error recovery
5. Test edge cases
6. Load test (use production-like environment)
7. Security audit
8. Go live with confidence!

---

**Remember:** Always test thoroughly before going live. Stripe's test environment is designed to help you catch issues early!
