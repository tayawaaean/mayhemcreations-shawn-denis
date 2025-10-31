# Quick Integration Guide

Fast-track guide to integrate new email notifications into your main backend.

## Prerequisites

- Email service running on port 5002
- SMTP credentials configured
- Webhook secret set in both services

## Step-by-Step Integration

### 1. Order Confirmation (When Order is Created)

**Location**: `backend/src/controllers/orderReviewController.ts` or similar

```typescript
import { emailWebhookService } from '../services/emailWebhookService';

// After order is successfully created
await emailWebhookService.sendWebhook({
  event: 'order_confirmed',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    orderNumber: order.orderNumber,
    orderId: order.id,
    orderItems: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    shippingCost: order.shippingCost,
    orderTotal: order.total,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    estimatedDeliveryDate: order.estimatedDelivery,
    timestamp: new Date().toISOString()
  }
});
```

---

### 2. Shipping Confirmation (When Label is Created)

**Location**: `backend/src/controllers/shippingController.ts`

```typescript
// After shipping label is created
await emailWebhookService.sendWebhook({
  event: 'shipping_confirmed',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    orderNumber: order.orderNumber,
    orderId: order.id,
    shippingInfo: {
      carrier: label.carrier,
      service: label.serviceCode,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrl,
      estimatedDeliveryDate: label.estimatedDeliveryDate,
      shippingCost: order.shippingCost
    },
    orderItems: order.items,
    shippingAddress: order.shippingAddress,
    timestamp: new Date().toISOString()
  }
});
```

---

### 3. Delivery Notification (From Webhook or Status Update)

**Location**: `backend/src/controllers/trackingController.ts`

```typescript
// When order status changes to 'delivered'
if (order.status === 'delivered') {
  await emailWebhookService.sendWebhook({
    event: 'delivered',
    data: {
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      orderNumber: order.orderNumber,
      orderId: order.id,
      deliveryDate: order.deliveredAt || new Date().toISOString(),
      orderItems: order.items,
      timestamp: new Date().toISOString()
    }
  });
}
```

---

### 4. Refund Confirmation (When Refund is Processed)

**Location**: `backend/src/controllers/refundController.ts`

```typescript
// After refund is successfully processed
await emailWebhookService.sendWebhook({
  event: 'refund_confirmed',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    orderNumber: order.orderNumber,
    orderId: order.id,
    refundInfo: {
      refundId: refund.id,
      refundAmount: refund.amount,
      refundMethod: refund.method,
      refundDate: refund.processedAt,
      refundReason: refund.reason,
      itemsRefunded: refund.items
    },
    timestamp: new Date().toISOString()
  }
});
```

---

### 5. Payment Receipt (After Payment Success)

**Location**: `backend/src/controllers/paymentController.ts`

```typescript
// After successful payment (Stripe or PayPal)
await emailWebhookService.sendWebhook({
  event: 'payment_receipt',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    orderNumber: order.orderNumber,
    orderId: order.id,
    paymentInfo: {
      paymentMethod: payment.method,
      paymentProvider: payment.provider, // 'Stripe' or 'PayPal'
      transactionId: payment.transactionId,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      paidAmount: payment.amount
    },
    orderTotal: order.total,
    timestamp: new Date().toISOString()
  }
});
```

---

### 6. Review Request (Scheduled Job - 3-7 Days After Delivery)

**Location**: `backend/src/jobs/reviewRequestJob.ts` (create if needed)

```typescript
import cron from 'node-cron';
import { emailWebhookService } from '../services/emailWebhookService';
import { sequelize } from '../config/database';

// Run daily at 10 AM
cron.schedule('0 10 * * *', async () => {
  console.log('Running review request job...');
  
  // Find orders delivered 3-7 days ago without reviews
  const [orders] = await sequelize.query(`
    SELECT 
      o.id,
      o.order_number,
      o.order_data,
      u.email,
      u.first_name,
      u.last_name,
      o.delivered_at
    FROM order_reviews o
    JOIN users u ON o.user_id = u.id
    WHERE o.status = 'delivered'
      AND o.delivered_at BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND DATE_SUB(NOW(), INTERVAL 3 DAY)
      AND o.review_requested = FALSE
  `);

  for (const order of orders as any[]) {
    await emailWebhookService.sendWebhook({
      event: 'review_request',
      data: {
        customerName: `${order.first_name} ${order.last_name}`,
        customerEmail: order.email,
        orderNumber: order.order_number,
        orderId: order.id,
        orderItems: order.order_data,
        reviewUrl: `${process.env.FRONTEND_URL}/orders/${order.id}/review`,
        timestamp: new Date().toISOString()
      }
    });

    // Mark as review requested
    await sequelize.query(`
      UPDATE order_reviews 
      SET review_requested = TRUE 
      WHERE id = ?
    `, { replacements: [order.id] });
  }

  console.log(`Review requests sent for ${orders.length} orders`);
});
```

---

### 7. Newsletter (Admin Triggered)

**Location**: `backend/src/controllers/newsletterController.ts` (create if needed)

```typescript
// Send newsletter to subscribers
export const sendNewsletter = async (req: Request, res: Response) => {
  const { title, content, recipientEmails } = req.body;

  for (const email of recipientEmails) {
    await emailWebhookService.sendWebhook({
      event: 'newsletter',
      data: {
        recipientEmail: email.address,
        recipientName: email.name || 'Valued Customer',
        newsletterTitle: title,
        newsletterContent: content,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe?token=${email.token}`,
        timestamp: new Date().toISOString()
      }
    });
  }

  res.json({ success: true, sent: recipientEmails.length });
};
```

---

### 8. Account Update Notifications

**Location**: Various auth/account controllers

```typescript
// Password changed
await emailWebhookService.sendWebhook({
  event: 'account_update',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    updateType: 'Password Changed',
    updateDetails: 'Your account password was successfully changed.',
    actionRequired: false,
    actionUrl: `${process.env.FRONTEND_URL}/account/security`,
    timestamp: new Date().toISOString()
  }
});

// Email changed (requires verification)
await emailWebhookService.sendWebhook({
  event: 'account_update',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.newEmail,
    updateType: 'Email Address Changed',
    updateDetails: 'Your account email address has been updated. Please verify your new email.',
    actionRequired: true,
    actionUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
    timestamp: new Date().toISOString()
  }
});

// Suspicious login detected
await emailWebhookService.sendWebhook({
  event: 'account_update',
  data: {
    customerName: `${user.firstName} ${user.lastName}`,
    customerEmail: user.email,
    updateType: 'Security Alert',
    updateDetails: 'A login from a new device was detected. If this wasn\'t you, please secure your account immediately.',
    actionRequired: true,
    actionUrl: `${process.env.FRONTEND_URL}/account/security`,
    timestamp: new Date().toISOString()
  }
});
```

---

## Database Changes Required

### Add review_requested Column

```sql
-- Add column to track if review email was sent
ALTER TABLE order_reviews 
ADD COLUMN review_requested BOOLEAN DEFAULT FALSE
COMMENT 'Whether review request email has been sent';
```

---

## Testing Each Email Type

### Test Script

Create `backend/src/scripts/testEmailNotifications.ts`:

```typescript
import { emailWebhookService } from '../services/emailWebhookService';

async function testAllEmails() {
  const testData = {
    customerName: 'Test Customer',
    customerEmail: 'your-test-email@gmail.com',
    orderNumber: 'TEST-12345',
    orderId: 999,
    timestamp: new Date().toISOString()
  };

  // Test order confirmation
  console.log('Testing order confirmation...');
  await emailWebhookService.sendWebhook({
    event: 'order_confirmed',
    data: {
      ...testData,
      orderItems: [
        {
          productName: 'Test Product',
          variantName: 'Size: L',
          quantity: 2,
          price: 25.99,
          subtotal: 51.98,
          imageUrl: 'https://via.placeholder.com/150'
        }
      ],
      subtotal: 51.98,
      tax: 4.16,
      shippingCost: 5.99,
      orderTotal: 62.13,
      shippingAddress: {
        firstName: 'Test',
        lastName: 'Customer',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'TC',
        postalCode: '12345',
        country: 'USA'
      }
    }
  });

  // Add delays between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test shipping confirmation
  console.log('Testing shipping confirmation...');
  // ... add other test cases

  console.log('All tests completed!');
}

testAllEmails().catch(console.error);
```

Run with:
```bash
npm run ts-node src/scripts/testEmailNotifications.ts
```

---

## Environment Variables Checklist

### Main Backend `.env`:
```env
EMAIL_SERVICE_URL=http://localhost:5002
EMAIL_SERVICE_WEBHOOK_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

### Email Service `.env`:
```env
PORT=5002
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@mayhemcreations.com
ADMIN_NAME=Mayhem Creations Admin
FRONTEND_URL=http://localhost:5173
MAIN_BACKEND_WEBHOOK_SECRET=your-secret-key-here
```

---

## Verification Checklist

- [ ] Email service is running (`npm run dev` in services/)
- [ ] Health check passes (`curl http://localhost:5002/health`)
- [ ] Environment variables are set correctly
- [ ] Webhook secret matches in both services
- [ ] SMTP credentials are valid
- [ ] Test emails are received
- [ ] All 8 email types tested
- [ ] Email formatting looks good on mobile
- [ ] Links in emails work correctly
- [ ] Database changes applied (if needed)

---

## Troubleshooting

### Email Not Sending

```bash
# Check email service logs
tail -f services/logs/combined.log

# Test SMTP connection
curl http://localhost:5002/health

# Check webhook secret
echo $EMAIL_SERVICE_WEBHOOK_SECRET
```

### Webhook Errors

```bash
# Check main backend logs
tail -f backend/logs/combined.log

# Verify URL is correct
echo $EMAIL_SERVICE_URL

# Test webhook manually
curl -X POST http://localhost:5002/webhook/chat \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{"event":"order_confirmed","data":{...}}'
```

---

## Production Deployment

1. **Update Environment Variables** (production values)
2. **Deploy Email Service** (port 5002)
3. **Test on Staging** first
4. **Monitor Logs** closely
5. **Set up Email Alerts** for failures
6. **Configure SMTP** rate limits
7. **Enable Error** notifications

---

## Support

- Documentation: `services/EMAIL_NOTIFICATIONS_GUIDE.md`
- Implementation Details: `services/IMPLEMENTATION_SUMMARY.md`
- This Guide: `services/QUICK_INTEGRATION.md`

---

*Ready to integrate? Start with Step 1 and work through each email type!*

