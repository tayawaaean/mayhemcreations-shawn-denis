# 🚀 Mayhem Creations - Development Roadmap

## Current Status: ✅ Label Creation Working (Test Mode)

Your shipping label integration is **working perfectly in development mode** with ShipEngine test API. Labels are being created with "SAMPLE" watermarks as expected.

---

## **Phase 1: Complete Shipping Workflow** 🎯 (Current Priority)

### 1.1 Auto-Update Order Status After Label Creation ⏳
**Status:** Not Implemented  
**Priority:** HIGH  
**Location:** `backend/src/services/shipEngineLabelService.ts`

**What to do:**
- After successful label creation, automatically update order status to `'shipped'`
- Set `shipped_at` timestamp
- This is already partially implemented in `saveLabelToOrder()` but needs testing

**Current Code (Lines 501-512):**
```typescript
// Update order with label information and set status to 'shipped'
await sequelize.query(`
  UPDATE order_reviews 
  SET tracking_number = ?, 
      shipping_label_url = ?, 
      carrier_code = ?, 
      service_code = ?,
      status = 'shipped',
      shipped_at = NOW(),
      updated_at = NOW()
  WHERE id = ?
`, {
  replacements: [trackingNumber, labelUrlValue, carrierCodeValue, serviceCodeValue, orderId]
})
```

**Testing Steps:**
1. ✅ Create a test label
2. ✅ Verify order status changes to 'shipped'
3. ✅ Verify `shipped_at` timestamp is set
4. ✅ Verify frontend displays updated status

---

### 1.2 Send Tracking Email to Customers ⏳
**Status:** Not Implemented  
**Priority:** HIGH  
**Location:** Create new function in `backend/src/services/emailService.ts`

**What to do:**
```typescript
// Add this function to emailService.ts
static async sendShippingNotificationEmail(
  email: string,
  firstName: string,
  orderNumber: string,
  trackingNumber: string,
  carrierCode: string,
  estimatedDeliveryDate?: string
): Promise<boolean> {
  try {
    // Determine carrier tracking URL
    let trackingUrl = '';
    switch (carrierCode.toLowerCase()) {
      case 'usps':
        trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
        break;
      case 'ups':
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
        break;
      case 'fedex':
        trackingUrl = `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`;
        break;
      default:
        trackingUrl = '#';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Has Shipped - Mayhem Creations</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
          .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #e74c3c; margin-bottom: 10px; }
          .tracking-box { background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .tracking-number { font-size: 24px; font-weight: bold; color: #28a745; font-family: monospace; margin: 10px 0; }
          .button { display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .button:hover { background-color: #218838; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎨 Mayhem Creations</div>
            <h1>📦 Your Order Has Shipped!</h1>
          </div>
          
          <p>Hi ${firstName},</p>
          
          <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped and is on its way to you!</p>
          
          <div class="tracking-box">
            <p><strong>Tracking Information:</strong></p>
            <div class="tracking-number">${trackingNumber}</div>
            <p><strong>Carrier:</strong> ${carrierCode.toUpperCase()}</p>
            ${estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${estimatedDeliveryDate}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${trackingUrl}" class="button">Track Your Package</a>
          </div>
          
          <p>You can track your package in real-time using the tracking number above. Most carriers update tracking information within 24 hours of shipment.</p>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Your package is being prepared for delivery</li>
            <li>You'll receive updates as your package moves through the shipping network</li>
            <li>Once delivered, please inspect your items carefully</li>
            <li>If you have any issues, contact us within 7 days of delivery</li>
          </ul>
          
          <p>Thank you for choosing Mayhem Creations! We hope you love your custom products!</p>
          
          <div class="footer">
            <p>Questions? Contact us at support@mayhemcreations.com</p>
            <p>The Mayhem Creations Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      to: email,
      subject: `📦 Your Order ${orderNumber} Has Shipped!`,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info(`✅ Shipping notification sent to ${email}:`, result.messageId);
    return true;
  } catch (error) {
    logger.error('❌ Failed to send shipping notification:', error);
    return false;
  }
}
```

**Then update `shipEngineLabelService.ts` to call this:**
```typescript
// After saving label to database (around line 514)
// Get customer email from order
const [customerResult] = await sequelize.query(`
  SELECT u.email, u.first_name, o.order_number 
  FROM order_reviews o
  JOIN users u ON o.user_id = u.id
  WHERE o.id = ?
`, {
  replacements: [orderId],
  type: QueryTypes.SELECT
});

if (customerResult) {
  const customer = customerResult as any;
  await EmailService.sendShippingNotificationEmail(
    customer.email,
    customer.first_name,
    customer.order_number,
    labelData.trackingNumber,
    labelData.carrierCode
  );
}
```

---

### 1.3 Add Label Printing Functionality 📄
**Status:** Not Implemented  
**Priority:** MEDIUM  
**Location:** `frontend/src/admin/pages/PendingReview.tsx`

**What to do:**
- Add a "Print Label" button next to "Download Label"
- Use browser's print API to print the PDF directly
- This is useful for thermal label printers

**Code to add:**
```typescript
const handlePrintLabel = (pdfUrl: string) => {
  if (!pdfUrl) {
    alert('No label available to print');
    return;
  }
  
  // Open PDF in new window and trigger print dialog
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
};

// Add button in the UI:
<button
  onClick={() => handlePrintLabel(selectedReview.shipping_label_url || '')}
  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
>
  <Printer className="h-4 w-4" />
  <span>Print Label</span>
</button>
```

---

### 1.4 Display Tracking in Customer Dashboard 📱
**Status:** Not Implemented  
**Priority:** HIGH  
**Location:** `frontend/src/ecommerce/routes/MyOrders.tsx`

**What to add:**
```typescript
{/* Add this in the order details modal */}
{order.status === 'shipped' && order.tracking_number && (
  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
      <Truck className="h-5 w-5 text-green-600" />
      Your Package Has Shipped!
    </h4>
    <div className="space-y-2">
      <div>
        <p className="text-xs text-gray-500 uppercase">Tracking Number</p>
        <p className="font-mono text-sm font-semibold">{order.tracking_number}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase">Carrier</p>
        <p className="text-sm capitalize">{order.shipping_carrier || order.carrier_code}</p>
      </div>
      {order.shipped_at && (
        <div>
          <p className="text-xs text-gray-500 uppercase">Shipped On</p>
          <p className="text-sm">{new Date(order.shipped_at).toLocaleDateString()}</p>
        </div>
      )}
      <a
        href={getTrackingUrl(order.carrier_code, order.tracking_number)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors mt-2"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Track Package
      </a>
    </div>
  </div>
)}

// Helper function to generate tracking URLs
const getTrackingUrl = (carrierCode: string, trackingNumber: string): string => {
  switch (carrierCode?.toLowerCase()) {
    case 'usps':
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case 'ups':
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case 'fedex':
      return `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`;
    default:
      return '#';
  }
};
```

---

## **Phase 2: Production Deployment** 🚀 (After Development Testing)

### 2.1 Get Production ShipEngine API Key
**Status:** ⏳ Waiting  
**Priority:** CRITICAL (for production)

**Steps:**
1. Go to [ShipEngine.com](https://www.shipengine.com/)
2. Sign up for a production account
3. Complete carrier setup (connect USPS, UPS, FedEx accounts)
4. Get production API key (will NOT start with `TEST_`)
5. Update `.env` file:
   ```env
   SHIPENGINE_API_KEY=your_production_key_here
   NODE_ENV=production
   ```

**Cost Considerations:**
- ShipEngine charges per label created
- Carrier shipping costs are separate
- Consider volume discounts with carriers
- Test all features before going live

---

### 2.2 Setup Carrier Accounts
**Status:** Not Started  
**Priority:** CRITICAL (for production)

**Required Carrier Accounts:**
1. **USPS** (United States Postal Service)
   - Create business account at usps.com
   - Connect to ShipEngine
   - Lowest cost for light packages

2. **UPS** (Optional but recommended)
   - Create UPS account
   - Connect to ShipEngine
   - Better for heavier packages

3. **FedEx** (Optional)
   - Create FedEx account
   - Connect to ShipEngine
   - Best for express shipping

**ShipEngine Carrier Integration:**
- Log in to ShipEngine dashboard
- Navigate to "Carriers"
- Click "Add Carrier"
- Follow authentication flow for each carrier
- Note the `carrier_id` values for production

---

### 2.3 Environment Configuration
**Status:** Test Mode  
**Priority:** CRITICAL (before production)

**Production `.env` Setup:**
```env
# ShipEngine (PRODUCTION)
SHIPENGINE_API_KEY=your_production_api_key
NODE_ENV=production

# Email Service (Configure for production)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_business_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=Mayhem Creations <orders@mayhemcreations.com>

# Frontend URL (Production)
FRONTEND_URL=https://your-production-domain.com

# Database (Production)
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=mayhem_creations_prod

# Other production settings
STRIPE_SECRET_KEY=your_production_stripe_key
PAYPAL_CLIENT_ID=your_production_paypal_id
PAYPAL_CLIENT_SECRET=your_production_paypal_secret
```

**Security Checklist:**
- ✅ Never commit `.env` to Git
- ✅ Use environment-specific keys (test vs production)
- ✅ Enable SSL/TLS for production
- ✅ Set up proper CORS policies
- ✅ Enable rate limiting
- ✅ Set up monitoring and alerts

---

## **Phase 3: Advanced Features** 🎨 (Future Enhancements)

### 3.1 Batch Label Creation
**Priority:** LOW  
**Benefit:** Process multiple orders at once

**Implementation:**
- Select multiple orders in admin panel
- Click "Create Labels for Selected Orders"
- Download all labels as a ZIP file
- Auto-update all order statuses
- Send bulk tracking emails

---

### 3.2 Package Weight Automation
**Priority:** MEDIUM  
**Benefit:** More accurate shipping costs

**Current Status:** Using estimated weights (see `shipEngineLabelService.ts` line 455)

**Improvement:**
- Add `weight` field to product database
- Calculate actual package weight based on items
- Factor in packaging materials weight
- Update ShipEngine API calls with real weights

---

### 3.3 Return Labels
**Priority:** MEDIUM  
**Benefit:** Better customer service

**Implementation:**
- Add "Generate Return Label" button
- Create return label with customer as shipper
- Email return label to customer
- Track return shipments
- Update refund status when return delivered

---

### 3.4 International Shipping
**Priority:** LOW (if US only for now)  
**Benefit:** Expand to global market

**Requirements:**
- Customs forms generation
- International carrier accounts
- Currency conversion
- International tax/duty calculations
- Country-specific address validation

---

### 3.5 Real-Time Tracking Updates
**Priority:** LOW  
**Benefit:** Better customer experience

**Implementation:**
- Use ShipEngine webhooks for tracking events
- Set up webhook endpoint: `/api/v1/webhooks/shipengine`
- Update order status automatically (in-transit, out-for-delivery, delivered)
- Send email notifications for major tracking events
- Display real-time tracking in customer dashboard

---

## **Phase 4: Quality Assurance** ✅

### 4.1 Testing Checklist (Development)
- [x] Create label with test API key
- [x] Download label PDF
- [x] Update existing label
- [x] View tracking information in admin panel
- [ ] Test email notifications (shipping confirmation)
- [ ] Verify order status updates automatically
- [ ] Test customer tracking view
- [ ] Test error handling (invalid address, API failures)
- [ ] Test with different carriers (USPS, UPS, FedEx)
- [ ] Test with different service levels (Priority, Ground, Express)

### 4.2 Production Testing Checklist
- [ ] Switch to production API key
- [ ] Create test label with real carrier account
- [ ] Verify label is NOT marked "SAMPLE"
- [ ] Confirm shipping costs are accurate
- [ ] Test actual package shipment (internal test order)
- [ ] Verify tracking updates appear correctly
- [ ] Test customer notifications
- [ ] Monitor for errors in production logs
- [ ] Load testing for multiple simultaneous label creations

---

## **Quick Reference: What Works Now** ✅

### Currently Implemented:
✅ ShipEngine API integration  
✅ Label creation from admin panel  
✅ Label download (PDF)  
✅ Label update functionality  
✅ Tracking number storage  
✅ Carrier/service code storage  
✅ Order status updates to 'shipped'  
✅ Dynamic address extraction from orders  
✅ Dynamic carrier/service selection  
✅ Error handling and logging  
✅ Database schema for shipping data  

### Not Yet Implemented:
⏳ Customer email notifications (shipping confirmation)  
⏳ Customer tracking view in dashboard  
⏳ Label printing functionality  
⏳ Production API key setup  
⏳ Real carrier account integration  
⏳ Batch label creation  
⏳ Return labels  

---

## **Recommended Next Steps (Priority Order):**

1. **✅ Test Current Implementation**
   - Verify order status updates work
   - Test label download in different browsers
   - Check database updates are correct

2. **🔧 Add Email Notifications** (30 minutes)
   - Copy code from section 1.2 above
   - Test with your email
   - Verify customer receives tracking info

3. **📱 Add Customer Tracking View** (1 hour)
   - Update MyOrders.tsx with tracking display
   - Add "Track Package" button
   - Test customer experience

4. **🖨️ Add Print Label Feature** (15 minutes)
   - Simple addition to admin panel
   - Useful for thermal printers
   - Copy code from section 1.3

5. **🚀 Production Setup** (When ready to go live)
   - Get production ShipEngine API key
   - Setup carrier accounts
   - Update environment variables
   - Test with real shipment
   - Monitor for issues

---

## **Cost Estimates (Production)**

### ShipEngine Costs:
- Free tier: 25 labels/month
- Professional: $0.05 per label
- Enterprise: Custom pricing

### Carrier Costs (Approximate):
- USPS Priority Mail: $8-15 (1-3 day delivery)
- USPS First Class: $4-8 (2-5 day delivery)
- UPS Ground: $10-20 (1-5 day delivery)
- FedEx Ground: $12-25 (1-5 day delivery)

**Note:** Actual costs vary by package size, weight, and destination.

---

## **Support Resources**

- 📚 [ShipEngine API Documentation](https://www.shipengine.com/docs/)
- 📧 [ShipEngine Support](https://support.shipengine.com/)
- 💬 [ShipEngine Community Forum](https://community.shipengine.com/)
- 🎓 [ShipEngine Video Tutorials](https://www.youtube.com/c/shipengine)

---

**Last Updated:** October 16, 2025  
**Current Environment:** Development (Test Mode)  
**Production Ready:** No (Requires production API key and carrier accounts)

