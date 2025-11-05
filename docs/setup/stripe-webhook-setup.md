# Stripe Live Webhook Setup Guide

This guide provides step-by-step instructions for setting up Stripe webhooks in live/production mode to receive real-time payment events.

## Prerequisites

- Active Stripe account with live mode enabled
- Production deployment with a publicly accessible HTTPS endpoint
- Backend server running with webhook endpoint configured
- Access to Stripe Dashboard

## Overview

Stripe webhooks notify your application when important events occur, such as:
- Payment completion
- Payment failures
- Refunds
- Chargebacks/disputes
- Subscription changes

**Webhook Endpoint URL**: `https://yourdomain.com/api/v1/webhooks/stripe`

## Step 1: Prepare Your Production Environment

### 1.1 Update Environment Variables

In your production backend `.env` file, ensure you have:

```env
# Stripe Live Mode Configuration
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here

# Note: The webhook secret will be provided after creating the webhook endpoint
```

**Important**:
- Use live keys (starting with `sk_live_` for secret key)
- The webhook secret (starting with `whsec_`) is unique to each webhook endpoint
- Never commit these values to version control

### 1.2 Verify Webhook Endpoint is Accessible

Your webhook endpoint must be:
- Accessible over HTTPS (required by Stripe)
- Publicly reachable (no localhost or private IPs)
- Returning appropriate HTTP status codes (200 for success)

Test your endpoint:
```bash
curl -X POST https://yourdomain.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'
```

## Step 2: Create Webhook Endpoint in Stripe Dashboard

### 2.1 Access Webhooks Section

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in the top right)
3. Navigate to **Developers** > **Webhooks** in the left sidebar
4. Click **"Add endpoint"** button

### 2.2 Configure Webhook Endpoint

1. **Endpoint URL**: 
   ```
   https://yourdomain.com/api/v1/webhooks/stripe
   ```
   - Replace `yourdomain.com` with your actual production domain
   - Must use HTTPS (HTTP not allowed for live webhooks)
   - Must match exactly (including trailing slashes)

2. **Description** (optional):
   ```
   Mayhem Creation - Live Payment Webhooks
   ```
   - Helps identify the endpoint in your dashboard

3. **Version**:
   - Use the recommended API version (default is fine)
   - Currently using: `2025-08-27.basil`

### 2.3 Select Events to Listen To

Select the following events that your application handles:

#### Payment Events (Required)
- ✅ `payment_intent.succeeded` - Payment completed successfully
- ✅ `payment_intent.payment_failed` - Payment failed
- ✅ `payment_intent.created` - Payment intent created

#### Charge Events (Recommended)
- ✅ `charge.succeeded` - Charge completed successfully
- ✅ `charge.updated` - Charge status updated
- ✅ `charge.refund.created` - Refund initiated
- ✅ `charge.dispute.created` - Dispute/chargeback created

#### Checkout Events (Required for Stripe Checkout)
- ✅ `checkout.session.completed` - Checkout session completed
- ✅ `checkout.session.expired` - Checkout session expired

#### Customer Events (Optional but Recommended)
- ✅ `customer.created` - New customer created
- ✅ `customer.updated` - Customer information updated

#### Invoice Events (If using subscriptions)
- ✅ `invoice.payment_succeeded` - Invoice paid successfully
- ✅ `invoice.payment_failed` - Invoice payment failed

#### Quick Selection
You can click **"Select events"** and use these filters:
- Select category: **Payment**, **Charge**, **Checkout**, **Customer**
- Or manually select the events listed above

### 2.4 Create the Webhook

1. Review your configuration
2. Click **"Add endpoint"**
3. Wait for Stripe to create the endpoint

## Step 3: Retrieve Webhook Signing Secret

After creating the webhook endpoint:

1. **Click on the newly created webhook endpoint** in the list
2. Scroll to the **"Signing secret"** section
3. Click **"Reveal"** or **"Click to reveal"** to show the secret
4. **Copy the secret** - it starts with `whsec_`
   - Example: `whsec_1234567890abcdef...`
   - This is different from your API keys!

5. **Update your production environment**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
   ```

6. **Restart your backend server** to load the new secret

**Security Note**: 
- Never share or commit this secret
- Each webhook endpoint has a unique secret
- If you create a new endpoint, you'll get a new secret

## Step 4: Test the Webhook

### 4.1 Test Using Stripe Dashboard

1. In your webhook endpoint details page
2. Click **"Send test webhook"** button
3. Select an event type (e.g., `payment_intent.succeeded`)
4. Click **"Send test webhook"**
5. Check the **"Recent deliveries"** section for the response

**Expected Result**:
- Status: `200 OK` (or `2xx` success)
- Response time: Under 1 second
- No error messages

### 4.2 Test with Real Event (Recommended)

1. Make a **test payment** using a real card in live mode
2. Monitor your webhook endpoint logs
3. Check Stripe Dashboard > Webhooks > Recent deliveries
4. Verify the event was received and processed

### 4.3 Verify in Your Application

Check your backend logs for:
```
✅ Webhook received: payment_intent.succeeded
✅ Event processed successfully
```

## Step 5: Monitor Webhook Health

### 5.1 Stripe Dashboard Monitoring

In Stripe Dashboard > Webhooks > Your Endpoint:

- **Recent deliveries**: See last 100 webhook attempts
- **Success rate**: Should be close to 100%
- **Response times**: Should be under 1 second

### 5.2 Application Logs

Monitor your backend logs for:
- Webhook receipt confirmations
- Processing success/failure
- Any errors during event handling

### 5.3 Common Issues to Watch For

| Issue | Symptom | Solution |
|-------|---------|----------|
| Signature verification failed | 400 errors in Stripe | Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint secret |
| Timeout | 504 errors | Optimize webhook handler, ensure quick response |
| Missing events | Events not received | Verify event selection in webhook settings |
| Wrong endpoint | 404 errors | Check endpoint URL matches exactly |

## Step 6: Handle Webhook Failures

### 6.1 Automatic Retries

Stripe automatically retries failed webhooks:
- Immediate retry
- Then after 1 hour
- Then after 6 hours
- Then after 12 hours
- Then after 24 hours
- Up to 3 days total

### 6.2 Best Practices

1. **Return 200 quickly**: Respond with 200 OK immediately, then process asynchronously
2. **Idempotency**: Handle duplicate events gracefully
3. **Error handling**: Log errors but return 200 to prevent retries on permanent failures
4. **Monitoring**: Set up alerts for webhook failures

### 6.3 Manual Retry

If an event failed:
1. Go to Webhooks > Your Endpoint > Recent deliveries
2. Find the failed event
3. Click **"Send again"** to manually retry

## Step 7: Update Configuration for Multiple Environments

### 7.1 Separate Webhooks for Test/Live

You can maintain separate webhooks:
- **Test mode webhook**: For development/staging
  - Endpoint: `https://staging.yourdomain.com/api/v1/webhooks/stripe`
  - Secret: `whsec_test_secret`
  
- **Live mode webhook**: For production
  - Endpoint: `https://yourdomain.com/api/v1/webhooks/stripe`
  - Secret: `whsec_live_secret`

### 7.2 Environment-Specific Configuration

Update your backend to handle both:

```typescript
// Use different webhook secrets based on environment
const webhookSecret = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_WEBHOOK_SECRET_LIVE
  : process.env.STRIPE_WEBHOOK_SECRET_TEST;
```

## Step 8: Security Checklist

Before going live, verify:

- ✅ Webhook endpoint uses HTTPS only
- ✅ Webhook secret is stored securely (environment variable)
- ✅ Webhook signature verification is enabled
- ✅ Endpoint is not accessible without Stripe signature
- ✅ Error logging doesn't expose sensitive data
- ✅ Rate limiting is in place (optional but recommended)
- ✅ Webhook secret is different from API keys

## Step 9: Production Deployment Steps

1. **Deploy code** with webhook endpoint route
2. **Create webhook** in Stripe Dashboard (live mode)
3. **Copy webhook secret** to production environment variables
4. **Restart backend** to load new secret
5. **Test webhook** using Stripe Dashboard test feature
6. **Monitor** first few real transactions
7. **Verify** events are being processed correctly

## Supported Webhook Events

Your application currently handles these events:

```typescript
// Payment Intent Events
'payment_intent.created'
'payment_intent.succeeded'
'payment_intent.payment_failed'

// Charge Events
'charge.succeeded'
'charge.updated'
'charge.dispute.created'
'charge.refund.created'

// Checkout Session Events
'checkout.session.completed'
'checkout.session.expired'

// Customer Events
'customer.created'
'customer.updated'

// Subscription Events (if applicable)
'customer.subscription.created'
'customer.subscription.updated'
'customer.subscription.deleted'

// Invoice Events
'invoice.payment_succeeded'
'invoice.payment_failed'
```

## Troubleshooting

### Problem: "No signatures found matching the expected signature"

**Solution**:
- Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint secret
- Ensure you're using the correct secret for test vs live mode
- Check that the secret wasn't accidentally truncated or modified

### Problem: Webhook returns 500 error

**Solution**:
- Check backend logs for detailed error messages
- Ensure webhook handler code is production-ready
- Verify database connections and dependencies are working
- Test webhook handler with sample payload locally

### Problem: Webhooks not received

**Solution**:
- Verify endpoint URL is correct and accessible
- Check that events are selected in webhook configuration
- Ensure you're monitoring the correct Stripe account (test vs live)
- Check firewall/security settings aren't blocking Stripe IPs

### Problem: Duplicate events

**Solution**:
- Implement idempotency in your webhook handler
- Check event IDs to prevent duplicate processing
- This is normal - Stripe may send events multiple times

## Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
- [Webhook Security Guide](https://stripe.com/docs/webhooks/signatures)

## Support

If you encounter issues:
1. Check Stripe Dashboard > Webhooks > Recent deliveries for error details
2. Review backend application logs
3. Verify environment variables are set correctly
4. Test webhook endpoint accessibility
5. Contact Stripe support if needed

---

**Last Updated**: Based on current webhook implementation in `backend/src/controllers/webhookController.ts` and `backend/src/services/stripeService.ts`

