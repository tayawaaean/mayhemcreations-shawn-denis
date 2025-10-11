# ShipStation Integration Setup Guide

This guide explains how to integrate ShipStation API for automatic shipping cost calculation in your e-commerce application.

## Overview

The ShipStation integration allows you to:
- Calculate real-time shipping rates based on customer address
- Support multiple carriers (USPS, UPS, FedEx, etc.)
- Automatically select recommended shipping options
- Provide accurate delivery estimates
- Fallback to estimated rates if API is unavailable

## Prerequisites

1. **ShipStation Account**: Sign up at [https://www.shipstation.com](https://www.shipstation.com)
2. **API Credentials**: Generate API keys from ShipStation dashboard

## Getting Your ShipStation API Credentials

1. Log in to your ShipStation account
2. Go to **Settings** → **Account** → **API Settings**
3. Click **Generate New Keys**
4. Copy your **API Key** and **API Secret**

## Environment Configuration

Add the following variables to your `backend/.env` file:

```env
# ShipStation Configuration
SHIPSTATION_API_KEY=your_api_key_here
SHIPSTATION_API_SECRET=your_api_secret_here
SHIPSTATION_FROM_ZIP=10001  # Your warehouse/origin ZIP code
```

### Example with Real Credentials

```env
SHIPSTATION_API_KEY=TEST_GJcYlDB2jTh/qQdgd4855nnyzxHRXJn9HDVjntadGw8
SHIPSTATION_API_SECRET=your_secret_from_shipstation
SHIPSTATION_FROM_ZIP=90210  # Replace with your actual warehouse ZIP
```

## API Endpoint

### Calculate Shipping Rates

**Endpoint**: `POST /api/v1/shipping/rates`

**Authentication**: Required (Bearer token or session)

**Request Body**:
```json
{
  "address": {
    "street1": "123 Main St",
    "street2": "Apt 4B",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US"
  },
  "items": [
    {
      "id": "item_123",
      "name": "Custom Patch",
      "quantity": 2,
      "price": 29.99,
      "weight": {
        "value": 8,
        "units": "ounces"
      }
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "serviceName": "USPS Priority Mail",
        "serviceCode": "usps_priority_mail",
        "shipmentCost": 9.45,
        "otherCost": 0,
        "totalCost": 9.45,
        "estimatedDeliveryDays": 3,
        "carrier": "USPS"
      },
      {
        "serviceName": "USPS Priority Mail Express",
        "serviceCode": "usps_priority_mail_express",
        "shipmentCost": 24.90,
        "otherCost": 0,
        "totalCost": 24.90,
        "estimatedDeliveryDays": 2,
        "carrier": "USPS"
      }
    ],
    "recommendedRate": {
      "serviceName": "USPS Priority Mail",
      "serviceCode": "usps_priority_mail",
      "shipmentCost": 9.45,
      "otherCost": 0,
      "totalCost": 9.45,
      "estimatedDeliveryDays": 3,
      "carrier": "USPS"
    }
  },
  "message": "Shipping rates calculated successfully",
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

## Frontend Integration

The integration is already implemented in the checkout flow:

### OrderCheckout Component

1. **Step 1 (Shipping)**: User enters shipping address
2. **Step 1 → Step 2 Transition**: Automatic shipping rate calculation
3. **Step 2 (Payment)**: User selects preferred shipping option
4. **Step 3 (Review)**: Shows selected shipping method and cost

### Features

- **Real-time Rates**: Fetches actual shipping costs from ShipStation
- **Multiple Options**: Displays all available shipping services
- **Recommended Rate**: Highlights the best balance of cost and speed
- **Error Handling**: Falls back to estimated rates if API is unavailable
- **Loading States**: Shows loading indicator during rate calculation

## Weight Configuration

### Default Item Weight

If item weight is not specified, the system uses:
- **Default**: 8 ounces per item

### Setting Custom Weights

Update your product/order items to include weight:

```typescript
{
  id: "item_123",
  name: "Custom Patch",
  quantity: 1,
  price: 29.99,
  weight: {
    value: 12,
    units: "ounces"  // or "pounds" or "grams"
  }
}
```

## Package Dimensions

### Default Dimensions

If not specified, the system uses default package dimensions:
- **Length**: 12 inches
- **Width**: 12 inches
- **Height**: 6 inches

### Custom Dimensions

To use custom dimensions, modify the `getShippingRates` request in `shipstationService.ts`:

```typescript
dimensions: {
  length: 10,
  width: 8,
  height: 4,
  units: 'inches'
}
```

## Supported Carriers

The integration supports multiple carriers through ShipStation:

- **USPS** (stamps_com)
- **UPS** (ups)
- **FedEx** (fedex)
- **DHL** (dhl)
- **Canada Post** (canada_post)
- And many more...

### Selecting a Specific Carrier

By default, the system uses USPS (stamps_com). To use a different carrier:

1. Edit `backend/src/services/shipstationService.ts`
2. Update the `carrierCode` parameter:

```typescript
const response = await axios.post(
  `${SHIPSTATION_API_URL}/shipments/getrates`,
  {
    carrierCode: 'ups', // Change carrier here
    // ... rest of the request
  }
);
```

## Fallback Rates

If ShipStation API is unavailable, the system automatically provides fallback rates:

- **Standard Shipping**: $9.99 (5-day delivery)
- **Express Shipping**: $24.99 (2-day delivery)

These ensure checkout always works, even during API downtime.

## Testing

### Test Mode

ShipStation doesn't have a separate "test mode" like Stripe. However, you can:

1. Use your production API keys
2. Test with real addresses
3. Rates are calculated but no actual shipments are created
4. Only creating labels generates actual charges

### Test Addresses

Use real addresses for testing:

```javascript
// Valid test address
{
  street1: "1600 Amphitheatre Parkway",
  city: "Mountain View",
  state: "CA",
  postalCode: "94043",
  country: "US"
}
```

## Troubleshooting

### No Rates Returned

**Problem**: API returns empty array or no rates

**Solutions**:
1. Check API credentials are correct
2. Verify `SHIPSTATION_FROM_ZIP` is valid
3. Ensure destination address is complete and valid
4. Check ShipStation account has active carrier accounts
5. Review ShipStation dashboard for carrier setup

### Authentication Errors

**Problem**: `401 Unauthorized` or authentication failure

**Solutions**:
1. Verify API key and secret are correct
2. Check for extra spaces in environment variables
3. Regenerate API keys in ShipStation dashboard
4. Ensure account is active and not suspended

### Invalid Address Errors

**Problem**: API rejects address

**Solutions**:
1. Validate ZIP code matches city/state
2. Use full state names or 2-letter codes
3. Ensure country code is valid (e.g., "US" not "USA")
4. Check address spelling and formatting

### Rate Calculation Too Slow

**Problem**: Shipping rates take too long to load

**Solutions**:
1. Implement caching for repeat addresses
2. Pre-calculate rates for common destinations
3. Use fallback rates more aggressively
4. Consider rate limiting to prevent API overload

## Advanced Features

### Caching Rates

Implement Redis caching to reduce API calls:

```typescript
// Cache key: `shipping:${zipCode}:${weight}`
// Cache duration: 1 hour
```

### Multi-Package Shipments

For orders with multiple items, split into packages:

```typescript
// Calculate total weight
// If > 70 lbs, split into multiple packages
// Get rates for each package
// Sum total shipping cost
```

### International Shipping

Enable international shipping by:

1. Setting up international carriers in ShipStation
2. Updating country validation in checkout
3. Handling customs and duties

## API Rate Limits

ShipStation API has rate limits:

- **40 requests per minute** for regular endpoints
- Automatically handles rate limiting with backoff
- Consider caching frequently requested routes

## Security Best Practices

1. **Never expose API credentials** in frontend code
2. **Use environment variables** for all sensitive data
3. **Implement rate limiting** on your API endpoints
4. **Log API errors** for monitoring and debugging
5. **Validate all input** before sending to ShipStation

## Cost Optimization

1. **Cache rates** for common routes
2. **Batch rate requests** when possible
3. **Use fallback rates** for low-value orders
4. **Set minimum order** for real-time rate calculation
5. **Pre-negotiate rates** for high-volume routes

## Support

- **ShipStation Support**: https://help.shipstation.com
- **API Documentation**: https://www.shipstation.com/docs/api/
- **Developer Forum**: https://community.shipstation.com

## Files Modified

- `backend/src/services/shipstationService.ts` - Core ShipStation integration
- `backend/src/controllers/shippingController.ts` - API endpoint handler
- `backend/src/routes/shippingRoute.ts` - Route definition
- `backend/src/app.ts` - Route registration
- `frontend/src/shared/shippingApiService.ts` - Frontend API client
- `frontend/src/ecommerce/routes/OrderCheckout.tsx` - Checkout integration

## Next Steps

1. ✅ Add ShipStation credentials to `.env`
2. ✅ Set your warehouse ZIP code
3. ✅ Test with real addresses
4. ⏳ Configure product weights
5. ⏳ Set up carrier accounts in ShipStation
6. ⏳ Customize package dimensions (optional)
7. ⏳ Implement caching (optional)

Your ShipStation integration is now ready to use!


