# PayPal Webhook Production Testing Checklist

## Pre-Testing Setup

### ✅ Environment Variables Required:
```env
# PayPal API Credentials (PRODUCTION)
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
PAYPAL_ENVIRONMENT=production

# PayPal Webhook Configuration (PRODUCTION)
PAYPAL_WEBHOOK_ID=your_live_webhook_id

# Server Configuration
NODE_ENV=production
```

### ✅ Important: Webhook URL Accessibility

**If testing from local machine:**
- Your webhook endpoint **MUST be accessible from the internet**
- PayPal cannot reach `localhost` or `127.0.0.1`
- You'll need either:
  1. **Deploy to production server** (recommended)
  2. **Use tunneling** (ngrok, localtunnel, etc.) - even if you don't want to
  3. **Test with PayPal's webhook simulator** first (won't require internet access)

**Production webhook URL format:**
```
https://yourdomain.com/api/v1/payments/paypal/webhook
```

## Production Testing Steps

### 1. Verify Configuration
- [ ] `PAYPAL_ENVIRONMENT=production` is set
- [ ] `PAYPAL_WEBHOOK_ID` matches the webhook ID from PayPal Dashboard
- [ ] Webhook URL in PayPal Dashboard points to your production server
- [ ] Webhook is active and subscribed to correct events

### 2. Test Webhook Reception
- [ ] Check server logs when PayPal sends webhook
- [ ] Verify webhook headers are received:
  - `paypal-auth-algo`
  - `paypal-cert-url`
  - `paypal-transmission-id`
  - `paypal-transmission-sig`
  - `paypal-transmission-time`

### 3. Test Signature Verification
- [ ] Verify webhook signature verification succeeds
- [ ] Check logs for: `PayPal webhook signature verified successfully`
- [ ] If verification fails, check:
  - `PAYPAL_WEBHOOK_ID` matches dashboard
  - PayPal credentials are correct
  - Server can reach PayPal's API (`api-m.paypal.com`)

### 4. Test Payment Flow
- [ ] Make a real payment with PayPal
- [ ] Monitor server logs for webhook events
- [ ] Verify order status updates correctly
- [ ] Check database for payment/order records

## Expected Behavior

### ✅ Successful Verification:
```
PayPal webhook signature verified successfully
Processing PayPal webhook event: PAYMENT.CAPTURE.COMPLETED
```

### ❌ Verification Failure (Production):
```
PayPal webhook verification error in production: [error details]
HTTP 400: Webhook signature verification failed
```

**In production, webhooks with invalid signatures will be rejected** (this is correct behavior for security).

## Troubleshooting Production Issues

### Webhook Not Received?
1. **Check webhook URL** - Must be HTTPS and accessible from internet
2. **Check firewall/security groups** - Allow inbound POST requests
3. **Check server logs** - Look for incoming requests
4. **Use PayPal Dashboard** - Check webhook delivery status

### Signature Verification Failing?
1. **Verify `PAYPAL_WEBHOOK_ID`** - Must match dashboard exactly
2. **Check raw body** - Ensure `webhookBodyParser` middleware is applied
3. **Check headers** - All PayPal headers must be present (case-insensitive)
4. **Check network** - Server must be able to reach `api-m.paypal.com`
5. **Check credentials** - `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` must be live credentials

### Webhook Received But Not Processed?
1. **Check event type** - Verify event type is in your handler
2. **Check logs** - Look for "Processing PayPal webhook event" message
3. **Check database** - Verify order updates are happening
4. **Check error logs** - Look for errors in event handlers

## Important Production Notes

⚠️ **Security**: In production, invalid webhook signatures are **automatically rejected**. This is correct behavior.

⚠️ **Error Handling**: If verification fails, the webhook is rejected with HTTP 400. PayPal will retry failed webhooks.

⚠️ **Logging**: All webhook events and verification status are logged for debugging.

⚠️ **Response**: Always return HTTP 200 to PayPal (even on internal errors) to acknowledge receipt.

## Testing Without Internet Access

If you **must** test locally without tunneling, you can:

1. **Use PayPal Webhook Simulator** in dashboard
   - Go to your webhook in dashboard
   - Click "Send test notification"
   - Note: This may still require webhook URL to be accessible

2. **Deploy to production first**
   - Set up webhooks on production server
   - Test with real payments
   - Monitor logs and database

3. **Temporary development mode**
   - Set `NODE_ENV=development` temporarily
   - Verification will be skipped if `PAYPAL_WEBHOOK_ID` not set
   - ⚠️ **DO NOT use this in production**

## Next Steps

1. Deploy to production server
2. Configure webhook URL in PayPal Dashboard
3. Test with real payment
4. Monitor logs and verify order updates

