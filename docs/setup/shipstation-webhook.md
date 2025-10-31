# ShipStation Webhook Setup Guide

## Overview
This guide will help you configure ShipStation webhooks to receive real-time notifications about shipping events like label creation, tracking updates, and delivery confirmations.

## 🚀 **What's Included**

### **Webhook Events Supported:**
- **Track Events** - Real-time package tracking updates (In Transit, Delivered, etc.)
- **Batch Events** - Batch processing operations
- **Carrier Connected** - When carrier accounts are connected
- **Order Source Refresh** - When order data is refreshed
- **Rate Events** - Rate calculation events
- **Report Complete** - When reports are generated
- **Sales Order Imported** - When orders are imported

### **Automatic Actions:**
- ✅ Update order status in your database
- ✅ Send email notifications to customers
- ✅ Track shipment progress
- ✅ Update tracking information
- ✅ Handle delivery confirmations

## 🔧 **Setup Steps**

### **1. Environment Configuration**

**No additional environment variables needed!** 

ShipEngine webhooks don't use a secret key like Stripe. Authentication is handled automatically via User-Agent header verification.

### **2. Webhook Endpoints**

Your webhook endpoints are now available at:

- **ShipStation Webhook**: `https://yourdomain.com/api/v1/webhooks/shipstation`
- **Stripe Webhook**: `https://yourdomain.com/api/v1/webhooks/stripe`

### **3. ShipStation Account Configuration**

1. **Log into your ShipStation account**
2. **Go to Settings → Integrations → Webhooks**
3. **Click "Add Webhook"**
4. **Configure the webhook:**

   **Webhook URL:**
   ```
   https://yourdomain.com/api/v1/webhooks/shipstation
   ```

   **Events to Subscribe To:**
   - ✅ **Track** (Most Important - for shipping notifications)
   - ✅ **Batch** (Optional - for batch operations)
   - ✅ **Carrier Connected** (Optional - for carrier status updates)
   - ✅ **Order Source Refresh Complete** (Optional - for order sync)
   - ✅ **Rate** (Optional - for rate calculation events)
   - ✅ **Report Complete** (Optional - for report notifications)
   - ✅ **Sales Order Imported** (Optional - for new order processing)

   **HTTP Method:** `POST`
   **Content Type:** `application/json`

5. **No webhook secret needed** - ShipEngine handles authentication automatically
6. **Test the webhook** using ShipStation's test feature

### **4. Webhook Security**

The webhook system includes:
- ✅ **Signature Verification** - Validates requests come from ShipStation
- ✅ **Raw Body Parsing** - Ensures accurate signature verification
- ✅ **Error Handling** - Comprehensive error logging and responses
- ✅ **Rate Limiting** - Built-in protection against abuse

## 📋 **Webhook Event Details**

### **Shipment Notify**
**Triggered when:** A shipment is created
**Updates:**
- Order status → `shipped`
- Tracking number
- Carrier information
- Shipment timestamp

**Customer Actions:**
- Sends shipment notification email
- Includes tracking number and estimated delivery

### **Label Notify**
**Triggered when:** A shipping label is generated
**Updates:**
- Label URL in order record
- Label ID for reference

### **Tracking Notify**
**Triggered when:** Tracking status changes
**Updates:**
- Tracking status (`in_transit`, `out_for_delivery`, `delivered`)
- Location information
- Timestamp of status change

**Customer Actions:**
- Sends tracking update email
- Updates order status automatically

### **Order Notify**
**Triggered when:** Order status changes in ShipStation
**Updates:**
- Maps ShipStation status to your order status
- Handles cancellations and other status changes

## 🧪 **Testing Your Webhooks**

### **1. Test Webhook Endpoint**
```bash
curl -X POST https://yourdomain.com/api/v1/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -H "X-ShipStation-Signature: your_test_signature" \
  -d '{
    "resource_type": "shipment_notify",
    "timestamp": "2024-01-01T00:00:00Z",
    "resource_url": "https://ssapi.shipstation.com/shipments/123",
    "data": {
      "orderId": 123,
      "trackingNumber": "1Z999AA1234567890",
      "carrier": "UPS",
      "customerEmail": "customer@example.com"
    }
  }'
```

### **2. Check Logs**
Monitor your application logs for webhook processing:
```bash
# View webhook logs
tail -f logs/combined.log | grep "ShipStation webhook"
```

### **3. Verify Database Updates**
Check that orders are being updated correctly:
```sql
SELECT id, status, tracking_number, shipped_at 
FROM order_reviews 
WHERE tracking_number IS NOT NULL 
ORDER BY updated_at DESC;
```

## 📧 **Email Notifications**

The webhook system automatically sends these emails:

### **Shipment Notification**
- Sent when shipment is created
- Includes tracking number and carrier
- Estimated delivery date

### **Tracking Updates**
- Sent on significant status changes
- Current location and status
- Direct tracking link

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Webhook Not Receiving Events**
   - Check webhook URL is accessible
   - Verify webhook secret is correct
   - Check ShipStation webhook configuration

2. **Signature Verification Failed**
   - Ensure `SHIPSTATION_WEBHOOK_SECRET` is set correctly
   - Check that raw body parsing is working
   - Verify webhook secret matches ShipStation

3. **Database Updates Not Working**
   - Check database connection
   - Verify order IDs exist
   - Check for SQL errors in logs

4. **Email Notifications Not Sending**
   - Check email service configuration
   - Verify customer email addresses
   - Check email service logs

### **Debug Commands:**

```bash
# Check webhook endpoint
curl -I https://yourdomain.com/api/v1/webhooks/shipstation

# Test webhook with invalid signature (should return 400)
curl -X POST https://yourdomain.com/api/v1/webhooks/shipstation \
  -H "Content-Type: application/json" \
  -H "X-ShipStation-Signature: invalid_signature" \
  -d '{"test": "data"}'

# Check webhook logs
grep "ShipStation webhook" logs/combined.log
```

## 📊 **Monitoring**

### **Key Metrics to Monitor:**
- Webhook success rate
- Processing time
- Failed webhook attempts
- Email delivery rates
- Order status update accuracy

### **Log Patterns:**
```bash
# Successful webhook processing
grep "Webhook processed successfully" logs/combined.log

# Failed webhook processing
grep "Webhook processing error" logs/error.log

# Signature verification failures
grep "Invalid webhook signature" logs/error.log
```

## 🚀 **Production Deployment**

### **Before Going Live:**
1. ✅ Test all webhook events
2. ✅ Verify email notifications work
3. ✅ Check database updates
4. ✅ Monitor webhook processing
5. ✅ Set up proper logging
6. ✅ Configure monitoring alerts

### **Production Checklist:**
- [ ] Webhook URL is accessible from ShipStation
- [ ] Webhook secret is properly configured
- [ ] SSL certificate is valid
- [ ] Error handling is working
- [ ] Email notifications are sending
- [ ] Database updates are working
- [ ] Monitoring is in place

## 📞 **Support**

If you encounter issues:
1. Check the logs first
2. Verify webhook configuration
3. Test with ShipStation's webhook testing tool
4. Check database connectivity
5. Verify email service configuration

The webhook system is designed to be robust and handle errors gracefully, but proper monitoring and testing are essential for production use.
