# Email Notifications Guide

Complete guide for all email notification types in the Mayhem Creations Email Service.

## Overview

This email service handles all customer and admin email notifications via a webhook-based architecture. The main backend triggers webhooks, and this service processes them to send beautifully formatted emails.

## Supported Email Types

### 1. Order Confirmation Emails (`order_confirmed`)

Sent immediately after an order is successfully placed.

**Webhook Event**: `order_confirmed`

**Required Data**:
```json
{
  "event": "order_confirmed",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "orderItems": [
      {
        "productName": "Custom T-Shirt",
        "variantName": "Size: L, Color: Blue",
        "quantity": 2,
        "price": 25.99,
        "subtotal": 51.98,
        "imageUrl": "https://..."
      }
    ],
    "subtotal": 51.98,
    "tax": 4.16,
    "shippingCost": 5.99,
    "orderTotal": 62.13,
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA",
      "phone": "+1234567890"
    },
    "estimatedDeliveryDate": "2025-10-25",
    "timestamp": "2025-10-18T10:00:00Z"
  }
}
```

**Email Features**:
- Order summary with all items
- Price breakdown (subtotal, shipping, tax, total)
- Shipping address
- Estimated delivery date
- Link to track order status
- Professional branding

---

### 2. Shipping Confirmation Emails (`shipping_confirmed`)

Sent when an order is shipped with tracking information.

**Webhook Event**: `shipping_confirmed`

**Required Data**:
```json
{
  "event": "shipping_confirmed",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "shippingInfo": {
      "carrier": "USPS",
      "service": "Priority Mail",
      "trackingNumber": "9400111111111111111111",
      "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111111111111111111",
      "estimatedDeliveryDate": "2025-10-25",
      "shippingCost": 5.99
    },
    "orderItems": [...],
    "shippingAddress": {...},
    "timestamp": "2025-10-20T14:00:00Z"
  }
}
```

**Email Features**:
- Tracking information prominently displayed
- Direct link to track package
- Estimated delivery date
- List of shipped items
- Shipping address confirmation

---

### 3. Delivery Notification Emails (`delivered`)

Sent when a package is successfully delivered.

**Webhook Event**: `delivered`

**Required Data**:
```json
{
  "event": "delivered",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "deliveryDate": "2025-10-23T16:30:00Z",
    "orderItems": [...],
    "timestamp": "2025-10-23T16:30:00Z"
  }
}
```

**Email Features**:
- Delivery confirmation message
- Request for product review
- Link to leave review
- Order details reference
- Support contact information

---

### 4. Refund Confirmation Emails (`refund_confirmed`)

Sent when a refund is processed.

**Webhook Event**: `refund_confirmed`

**Required Data**:
```json
{
  "event": "refund_confirmed",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "refundInfo": {
      "refundId": "REF-54321",
      "refundAmount": 62.13,
      "refundMethod": "Original Payment Method",
      "refundDate": "2025-10-24T10:00:00Z",
      "refundReason": "Customer requested cancellation",
      "itemsRefunded": [...]
    },
    "timestamp": "2025-10-24T10:00:00Z"
  }
}
```

**Email Features**:
- Refund amount prominently displayed
- Refund ID for tracking
- Processing timeline information
- List of refunded items
- Support contact

---

### 5. Payment Receipt Emails (`payment_receipt`)

Sent after successful payment processing.

**Webhook Event**: `payment_receipt`

**Required Data**:
```json
{
  "event": "payment_receipt",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "paymentInfo": {
      "paymentMethod": "Credit Card",
      "paymentProvider": "Stripe",
      "transactionId": "pi_1234567890",
      "cardLast4": "4242",
      "cardBrand": "Visa",
      "paidAmount": 62.13
    },
    "orderTotal": 62.13,
    "timestamp": "2025-10-18T10:05:00Z"
  }
}
```

**Email Features**:
- Payment confirmation
- Transaction details
- Card information (last 4 digits)
- Receipt for records
- Link to order details

---

### 6. Review Request Emails (`review_request`)

Sent after delivery to request product reviews.

**Webhook Event**: `review_request`

**Required Data**:
```json
{
  "event": "review_request",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "orderNumber": "ORD-12345",
    "orderId": 123,
    "orderItems": [...],
    "reviewUrl": "https://mayhemcreations.com/orders/123/review",
    "timestamp": "2025-10-25T10:00:00Z"
  }
}
```

**Email Features**:
- Product images
- Star rating visual
- Direct link to review page
- Incentive mention (10% discount code)
- Easy 2-minute process

---

### 7. Newsletter Emails (`newsletter`)

Sent for marketing, promotions, and announcements.

**Webhook Event**: `newsletter`

**Required Data**:
```json
{
  "event": "newsletter",
  "data": {
    "recipientEmail": "john@example.com",
    "recipientName": "John Doe",
    "newsletterTitle": "New Products This Week!",
    "newsletterContent": "<h2>Check out our latest designs...</h2><p>...</p>",
    "unsubscribeUrl": "https://mayhemcreations.com/unsubscribe?token=abc123",
    "timestamp": "2025-10-18T10:00:00Z"
  }
}
```

**Email Features**:
- Custom HTML content support
- Branded header
- Call-to-action button
- Unsubscribe link
- Professional footer

---

### 8. Account Update Notifications (`account_update`)

Sent for security alerts, profile changes, password resets, etc.

**Webhook Event**: `account_update`

**Required Data**:
```json
{
  "event": "account_update",
  "data": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "updateType": "Password Changed",
    "updateDetails": "Your account password was successfully changed on October 18, 2025 at 10:00 AM.",
    "actionRequired": false,
    "actionUrl": "https://mayhemcreations.com/account/security",
    "timestamp": "2025-10-18T10:00:00Z"
  }
}
```

**Email Features**:
- Security alert styling
- Action required indicator
- Direct action link
- Security notice
- Support contact

---

## Integration Guide

### From Main Backend

To trigger an email notification from your main backend:

```typescript
import { emailWebhookService } from './services/emailWebhookService';

// Example: Send order confirmation
await emailWebhookService.sendWebhook({
  event: 'order_confirmed',
  data: {
    customerName: user.firstName + ' ' + user.lastName,
    customerEmail: user.email,
    orderNumber: order.orderNumber,
    orderId: order.id,
    orderItems: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    shippingCost: order.shippingCost,
    orderTotal: order.total,
    shippingAddress: order.shippingAddress,
    estimatedDeliveryDate: order.estimatedDelivery,
    timestamp: new Date().toISOString()
  }
});
```

### Environment Configuration

Ensure these are set in your main backend's `.env`:

```env
EMAIL_SERVICE_URL=http://localhost:5002
EMAIL_SERVICE_WEBHOOK_SECRET=your-webhook-secret-key
```

And in the email service's `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@mayhemcreations.com
FRONTEND_URL=http://localhost:5173
MAIN_BACKEND_WEBHOOK_SECRET=your-webhook-secret-key
```

---

## Email Templates

All emails include:
- Responsive HTML design
- Plain text fallback
- Professional branding
- Mobile-friendly layout
- Clear call-to-action buttons
- Footer with contact information

### Design Features:
- **Color Schemes**: Different gradients for different email types
- **Buttons**: Prominent, action-oriented CTAs
- **Icons**: Visual indicators for quick recognition
- **Typography**: Clean, readable fonts
- **Spacing**: Adequate white space for readability

---

## Testing

### Test Single Email Type

```bash
cd services
node test-integration.js
```

### Test Specific Event

Use the webhookController's test endpoint:

```bash
curl -X POST http://localhost:5002/webhook/chat \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret-key" \
  -d '{
    "event": "order_confirmed",
    "data": {...}
  }'
```

---

## Monitoring

### Check Service Health

```bash
curl http://localhost:5002/health
```

### View Logs

```bash
# Email service logs
tail -f services/logs/combined.log

# Error logs only
tail -f services/logs/error.log
```

---

## Troubleshooting

### Email Not Sending

1. **Check SMTP Configuration**
   - Verify credentials in `.env`
   - For Gmail, ensure "Less secure app access" is enabled or use App Password
   
2. **Check Service Status**
   ```bash
   curl http://localhost:5002/health
   ```

3. **Check Logs**
   ```bash
   tail -f services/logs/error.log
   ```

### Webhook Not Received

1. **Verify URL**
   - Check `EMAIL_SERVICE_URL` in main backend
   
2. **Verify Secret**
   - Ensure `EMAIL_SERVICE_WEBHOOK_SECRET` matches in both services
   
3. **Check Network**
   - Ensure email service is running on port 5002
   - Check firewall settings

### Email Formatting Issues

1. **Test with Different Clients**
   - Gmail, Outlook, Yahoo, etc.
   
2. **Check HTML Template**
   - Validate HTML structure
   - Test responsive design
   
3. **Plain Text Fallback**
   - Ensure text version is readable

---

## Best Practices

### 1. Timing
- **Order Confirmation**: Immediately after order placement
- **Shipping Confirmation**: When tracking number is available
- **Delivery Notification**: 1-2 hours after delivery
- **Review Request**: 3-7 days after delivery
- **Refund Confirmation**: Immediately after processing

### 2. Content
- Keep subject lines clear and concise
- Use customer's name for personalization
- Include all relevant order/transaction details
- Provide clear next steps or actions

### 3. Branding
- Consistent color scheme across all emails
- Include company logo
- Professional tone
- Contact information in footer

### 4. Security
- Always use HTTPS for links
- Include unsubscribe options for marketing emails
- Notify users of security-related changes
- Use webhook authentication

---

## Support

For issues or questions:
- Email: support@mayhemcreations.com
- Check logs: `services/logs/`
- Review documentation: This file
- Test integration: `services/test-integration.js`

---

## Changelog

### Version 2.0.0 (October 2025)
- Added order confirmation emails
- Added shipping confirmation emails
- Added delivery notification emails
- Added refund confirmation emails
- Added payment receipt emails
- Added review request emails
- Added newsletter/marketing emails
- Added account update notifications
- Enhanced webhook validation
- Improved error handling
- Updated email templates with modern design

### Version 1.0.0
- Initial chat notification system
- Admin notifications
- Customer notifications
- Conversation summaries

