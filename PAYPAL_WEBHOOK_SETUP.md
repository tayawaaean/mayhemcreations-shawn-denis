# PayPal Webhook Setup Guide

## Understanding PayPal Webhooks

Unlike Stripe, **PayPal doesn't use webhook secrets**. Instead, PayPal uses:
- **Webhook ID**: The ID of the webhook you create in PayPal Dashboard
- **Signature Verification**: Uses PayPal's API to verify webhook signatures via headers

## Step 1: Create Webhook in PayPal Dashboard

1. **Go to PayPal Developer Dashboard**: https://developer.paypal.com/
2. **Login** and navigate to **My Apps & Credentials**
3. **Select your app** (or create one if you haven't)
4. Scroll down to **Webhooks** section (under "Live" for production, "Sandbox" for testing)
5. Click **Add Webhook** or **+ Webhook**
6. Enter your webhook URL: `https://yourdomain.com/api/v1/payments/paypal/webhook`
7. **Select Event Types** you want to listen to:
   - `PAYMENT.CAPTURE.COMPLETED` ✅ (Required)
   - `PAYMENT.CAPTURE.DENIED` ✅ (Recommended)
   - `PAYMENT.CAPTURE.REFUNDED` ✅ (For refunds)
   - `CHECKOUT.ORDER.APPROVED` ✅ (Recommended)
   - `CHECKOUT.ORDER.COMPLETED` ✅ (Recommended)
8. Click **Save**
9. **Copy the Webhook ID** - You'll need this for `PAYPAL_WEBHOOK_ID` env variable

## Step 2: Environment Variables

Add to your `.env` file:

```env
# PayPal Webhook Configuration
PAYPAL_WEBHOOK_ID=your_webhook_id_from_dashboard
# Example: PAYPAL_WEBHOOK_ID=0EH40505U7160970P
```

## Step 3: How PayPal Webhook Verification Works

PayPal sends webhooks with these headers:
- `PAYPAL-AUTH-ALGO`: Algorithm used (usually "SHA256withRSA")
- `PAYPAL-CERT-URL`: URL to download PayPal's certificate
- `PAYPAL-TRANSMISSION-ID`: Unique transmission ID
- `PAYPAL-TRANSMISSION-SIG`: The signature to verify
- `PAYPAL-TRANSMISSION-TIME`: Timestamp of transmission

We verify the signature using PayPal's **Verify Webhook Signature API** endpoint.

## Step 4: Webhook URL Configuration

**Development/Testing:**
- Use ngrok or similar to expose localhost: `https://your-ngrok-url.ngrok.io/api/v1/payments/paypal/webhook`
- Or use PayPal's webhook simulator for testing

**Production:**
- Use your production domain: `https://yourdomain.com/api/v1/payments/paypal/webhook`
- **Must be HTTPS** - PayPal requires HTTPS for webhooks

## Step 5: Testing Webhooks

1. **PayPal Webhook Simulator**: 
   - In PayPal Dashboard → Webhooks → Select your webhook → "Send test notification"
   - Choose event type and click "Send"

2. **Test with actual payments**:
   - Make a test payment
   - Check your server logs for webhook events
   - Verify order status updates correctly

## Important Notes

- **No Secret Key**: PayPal doesn't use a secret like Stripe
- **Webhook ID Required**: Must configure `PAYPAL_WEBHOOK_ID` from dashboard
- **HTTPS Required**: Production webhooks must use HTTPS
- **Raw Body**: PayPal webhooks need raw body for signature verification (already implemented)
- **200 Response**: Always return 200 OK to PayPal (even on errors, handle internally)

## Troubleshooting

**Webhook not receiving events?**
- Check webhook URL is accessible from internet
- Verify webhook is active in PayPal Dashboard
- Check server logs for incoming requests
- Ensure route is not protected by authentication

**Signature verification failing?**
- Verify `PAYPAL_WEBHOOK_ID` matches dashboard
- Check that raw body middleware is applied
- Ensure headers are being passed correctly
- Check PayPal certificate URL is accessible

**Events not being processed?**
- Check event type is in your handler switch statement
- Verify event handler logic
- Check database for order updates
- Review server logs for errors

