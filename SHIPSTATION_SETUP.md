# 🚢 ShipStation Integration Setup Guide

This guide will help you set up ShipStation integration for your Mayhem Creations e-commerce platform.

## 📋 Prerequisites

- ShipStation account (https://www.shipstation.com/)
- Admin access to your ShipStation account
- Backend server running on port 5001
- Frontend running on port 5173

## 🔑 Step 1: Get ShipStation API Credentials

### 1.1 Login to ShipStation
1. Go to https://www.shipstation.com/
2. Login to your ShipStation account

### 1.2 Access API Settings
1. Navigate to **Settings** → **API Settings**
2. Click **"Generate New API Key"**
3. Copy your **API Key** and **API Secret**
4. Keep these credentials secure - you'll need them for the environment variables

## 🔧 Step 2: Configure Environment Variables

### 2.1 Backend Environment Variables
Add these variables to your `backend/.env` file:

```env
# ShipStation API Configuration
SHIPSTATION_API_KEY=your_shipstation_api_key_here
SHIPSTATION_API_SECRET=your_shipstation_api_secret_here
SHIPSTATION_BASE_URL=https://ssapi.shipstation.com
```

### 2.2 Example Configuration
```env
# Example (replace with your actual credentials)
SHIPSTATION_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
SHIPSTATION_API_SECRET=secret123def456ghi789jkl012mno345pqr678stu901vwx234yz
SHIPSTATION_BASE_URL=https://ssapi.shipstation.com
```

## 🚀 Step 3: Restart Your Services

### 3.1 Restart Backend
```bash
cd backend
npm run dev
```

### 3.2 Restart Frontend
```bash
cd frontend
npm run dev
```

## 🎯 Step 4: Test the Integration

### 4.1 Test API Connection
1. Go to your admin panel: `http://localhost:5173/admin`
2. Navigate to **Shipping** → **ShipStation**
3. The page should show "ShipStation connection successful" if configured correctly
4. If you see "ShipStation Not Configured", check your environment variables

### 4.2 Test Tracking Feature
1. Go to: `http://localhost:5173/track-order`
2. Enter a valid tracking number
3. The system should display tracking information

## 🔗 Step 5: Configure Webhooks (Optional)

### 5.1 Set Up Webhook URLs
In your ShipStation account:

1. Go to **Settings** → **Webhooks**
2. Add these webhook URLs:
   - **Order Updates**: `http://your-domain.com/api/v1/shipstation/webhooks/order-update`
   - **Shipment Updates**: `http://your-domain.com/api/v1/shipstation/webhooks/shipment-update`

### 5.2 Webhook Events to Enable
Enable these events in ShipStation:
- Order Created
- Order Updated
- Order Shipped
- Order Delivered
- Order Cancelled
- Shipment Created
- Shipment Updated
- Shipment Delivered
- Shipment Exception

## 📱 Step 6: Using the Features

### 6.1 Admin Panel Features
Access via `http://localhost:5173/admin/shipstation`:

- **Dashboard**: View shipping statistics
- **Carriers**: See available shipping carriers
- **Orders**: View and manage ShipStation orders
- **Create Labels**: Generate shipping labels
- **Get Rates**: Calculate shipping costs

### 6.2 Customer Features
Access via `http://localhost:5173/track-order`:

- **Order Tracking**: Customers can track their orders
- **Real-time Updates**: Get live tracking information
- **Delivery Status**: See current delivery status

## 🛠️ Step 7: Integration with Order Workflow

### 7.1 Automatic Order Creation
When an order is placed in your system, you can automatically create it in ShipStation:

```typescript
// Example: Create order in ShipStation after local order creation
const shipStationOrder = await shipStationApiService.createOrder({
  orderNumber: localOrder.orderNumber,
  orderDate: localOrder.createdAt,
  orderStatus: 'awaiting_shipment',
  billTo: {
    name: localOrder.billingAddress.name,
    street1: localOrder.billingAddress.street1,
    city: localOrder.billingAddress.city,
    state: localOrder.billingAddress.state,
    postalCode: localOrder.billingAddress.postalCode,
    country: localOrder.billingAddress.country
  },
  shipTo: {
    name: localOrder.shippingAddress.name,
    street1: localOrder.shippingAddress.street1,
    city: localOrder.shippingAddress.city,
    state: localOrder.shippingAddress.state,
    postalCode: localOrder.shippingAddress.postalCode,
    country: localOrder.shippingAddress.country
  },
  items: localOrder.items.map(item => ({
    name: item.productName,
    quantity: item.quantity,
    unitPrice: item.price,
    weight: {
      value: item.weight || 1,
      units: 'pounds'
    }
  }))
});
```

### 7.2 Label Generation
Generate shipping labels when orders are ready to ship:

```typescript
// Example: Create shipping label
const label = await shipStationApiService.createLabel({
  carrierCode: 'ups',
  serviceCode: 'ups_ground',
  packageCode: 'package',
  shipDate: new Date().toISOString(),
  weight: {
    value: orderWeight,
    units: 'pounds'
  },
  shipFrom: {
    name: 'Mayhem Creations',
    street1: '123 Business St',
    city: 'Your City',
    state: 'Your State',
    postalCode: '12345',
    country: 'US'
  },
  shipTo: order.shippingAddress
});
```

## 🔍 Step 8: Troubleshooting

### 8.1 Common Issues

**Issue**: "ShipStation API credentials not configured"
- **Solution**: Check that your environment variables are set correctly
- **Check**: Restart your backend server after adding environment variables

**Issue**: "Connection failed"
- **Solution**: Verify your API key and secret are correct
- **Check**: Test your credentials in ShipStation's API documentation

**Issue**: "Tracking not found"
- **Solution**: Ensure the tracking number is valid and exists in ShipStation
- **Check**: Verify the order was created in ShipStation first

### 8.2 Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed logs in your backend console.

### 8.3 API Rate Limits
ShipStation has API rate limits:
- **Sandbox**: 100 requests per minute
- **Production**: 1000 requests per minute

If you hit rate limits, the system will automatically retry with exponential backoff.

## 📚 Step 9: API Reference

### 9.1 Available Endpoints

**Admin Endpoints** (require admin/manager role):
- `GET /api/v1/shipstation/test-connection` - Test API connection
- `GET /api/v1/shipstation/carriers` - Get available carriers
- `POST /api/v1/shipstation/rates` - Get shipping rates
- `POST /api/v1/shipstation/labels` - Create shipping label
- `GET /api/v1/shipstation/shipments/:id` - Get shipment details
- `GET /api/v1/shipstation/tracking/:number` - Get tracking info
- `POST /api/v1/shipstation/orders` - Create order
- `GET /api/v1/shipstation/orders` - Get orders
- `PUT /api/v1/shipstation/orders/:id/status` - Update order status
- `GET /api/v1/shipstation/warehouses` - Get warehouses
- `GET /api/v1/shipstation/stores` - Get stores

**Public Endpoints**:
- `GET /api/v1/shipstation/tracking/:number` - Get tracking info (public)

**Webhook Endpoints**:
- `POST /api/v1/shipstation/webhooks/order-update` - Order webhooks
- `POST /api/v1/shipstation/webhooks/shipment-update` - Shipment webhooks

### 9.2 Frontend Components

**Admin Components**:
- `ShipStationManagement` - Main admin interface
- `ShipStationApiService` - API service for frontend

**Customer Components**:
- `OrderTracking` - Customer tracking interface

## 🎉 Step 10: You're All Set!

Your ShipStation integration is now complete! You can:

✅ **Admin Features**:
- View shipping statistics
- Manage carriers and warehouses
- Create shipping labels
- Track orders and shipments
- Get real-time updates via webhooks

✅ **Customer Features**:
- Track orders with tracking numbers
- Get real-time delivery updates
- View delivery status and history

✅ **Integration Features**:
- Automatic order synchronization
- Real-time webhook notifications
- Comprehensive error handling
- Rate limit management

## 📞 Support

If you encounter any issues:

1. **Check the logs**: Look at your backend console for error messages
2. **Verify credentials**: Ensure your API keys are correct
3. **Test connection**: Use the admin panel to test the API connection
4. **Check webhooks**: Verify webhook URLs are accessible from ShipStation

For additional help, refer to:
- [ShipStation API Documentation](https://www.shipstation.com/api/)
- [ShipStation Webhook Documentation](https://help.shipstation.com/hc/en-us/articles/360025856911-Webhooks)

---

**Happy Shipping! 🚢📦**
