# ShipEngine Integration Setup Guide

## Overview

ShipEngine integration provides real-time shipping rate calculations from multiple carriers (USPS, UPS, FedEx, DHL, etc.) with automatic rate shopping to find the best prices for your customers.

**Origin Address:** 128 Persimmon Dr, Newark, OH 43055

## What's ShipEngine?

ShipEngine is a shipping API platform that provides:
- ✅ Real-time shipping rates from multiple carriers
- ✅ Address validation
- ✅ Label creation
- ✅ Package tracking
- ✅ Rate shopping (compares all carriers automatically)

## Prerequisites

1. **ShipEngine Account**: Sign up at [https://www.shipengine.com](https://www.shipengine.com)
2. **API Key**: Get your API key from the ShipEngine dashboard

**Note:** If you have a ShipStation account, you can use the same API key for ShipEngine!

## Getting Your ShipEngine API Key

### Option 1: From ShipEngine Dashboard
1. Log in to [https://app.shipengine.com](https://app.shipengine.com)
2. Go to **API & Integrations** → **API Management**
3. Click **Generate New API Key**
4. Copy your API key
5. Save it securely

### Option 2: From ShipStation (if you have an account)
1. Log in to your ShipStation account
2. Go to **Settings** → **Account** → **API Settings**
3. Your ShipStation API key works with ShipEngine too!

## Environment Configuration

Add your API key to `backend/.env`:

```env
# ShipStation / ShipEngine API Configuration
SHIPSTATION_API_KEY=TEST_HUcYlDB2jTh/qQdgd4855nnyzxHRXJn9HDVjntadGw8

# Optional: Add phone number for origin address
ORIGIN_PHONE=+1234567890
```

**Important Notes:**
- The origin address is hard-coded in the service: **128 Persimmon Dr, Newark, OH 43055**
- To change the origin address, edit `backend/src/services/shipEngineService.ts`
- Phone number is optional but recommended for better service

## API Endpoints

### 1. Calculate Shipping Rates

**Endpoint:** `POST /api/v1/shipping/shipengine/rates`

**Request:**
```json
{
  "address": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "apartment": "Apt 4B",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90001",
    "country": "US",
    "phone": "+13105551234"
  },
  "items": [
    {
      "id": "item_123",
      "name": "Custom Patch",
      "quantity": 2,
      "price": 29.99,
      "weight": {
        "value": 8,
        "unit": "ounce"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "serviceName": "USPS Priority Mail",
        "serviceCode": "usps_priority_mail",
        "carrier": "USPS",
        "carrierCode": "stamps_com",
        "shipmentCost": 9.45,
        "otherCost": 0,
        "totalCost": 9.45,
        "estimatedDeliveryDays": 3,
        "estimatedDeliveryDate": "2025-10-17",
        "guaranteed": false,
        "trackable": true
      },
      {
        "serviceName": "UPS Ground",
        "serviceCode": "ups_ground",
        "carrier": "UPS",
        "carrierCode": "ups",
        "shipmentCost": 12.30,
        "otherCost": 0,
        "totalCost": 12.30,
        "estimatedDeliveryDays": 5,
        "guaranteed": false,
        "trackable": true
      },
      {
        "serviceName": "FedEx Home Delivery",
        "serviceCode": "fedex_home_delivery",
        "carrier": "FedEx",
        "carrierCode": "fedex",
        "shipmentCost": 13.85,
        "otherCost": 0,
        "totalCost": 13.85,
        "estimatedDeliveryDays": 4,
        "guaranteed": false,
        "trackable": true
      }
    ],
    "recommendedRate": {
      "serviceName": "USPS Priority Mail",
      "serviceCode": "usps_priority_mail",
      "carrier": "USPS",
      "carrierCode": "stamps_com",
      "shipmentCost": 9.45,
      "otherCost": 0,
      "totalCost": 9.45,
      "estimatedDeliveryDays": 3,
      "guaranteed": false,
      "trackable": true
    },
    "origin": {
      "city": "Newark",
      "state": "OH",
      "postalCode": "43055"
    }
  },
  "message": "Shipping rates calculated successfully",
  "timestamp": "2025-10-14T12:00:00.000Z"
}
```

### 2. Validate Address

**Endpoint:** `POST /api/v1/shipping/shipengine/validate-address`

**Request:**
```json
{
  "address": {
    "street": "1600 Amphitheatre Parkway",
    "city": "Mountain View",
    "state": "CA",
    "zipCode": "94043",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "verified",
    "original_address": {...},
    "matched_address": {...},
    "messages": []
  },
  "message": "Address validated successfully"
}
```

### 3. Get Available Carriers

**Endpoint:** `GET /api/v1/shipping/shipengine/carriers`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "carrier_id": "se-123456",
      "carrier_code": "stamps_com",
      "friendly_name": "USPS",
      "primary": true,
      "has_multi_package_supporting_services": true
    },
    {
      "carrier_id": "se-123457",
      "carrier_code": "ups",
      "friendly_name": "UPS",
      "primary": true,
      "has_multi_package_supporting_services": true
    }
  ],
  "message": "Carriers retrieved successfully"
}
```

### 4. Track Shipment

**Endpoint:** `GET /api/v1/shipping/shipengine/track/:carrierCode/:trackingNumber`

**Example:** `GET /api/v1/shipping/shipengine/track/stamps_com/9400111899562537868616`

**Response:**
```json
{
  "success": true,
  "data": {
    "tracking_number": "9400111899562537868616",
    "carrier_code": "stamps_com",
    "status_code": "DE",
    "status_description": "Delivered",
    "events": [...]
  },
  "message": "Tracking information retrieved successfully"
}
```

### 5. Check Configuration Status

**Endpoint:** `GET /api/v1/shipping/shipengine/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "origin": {
      "address": "128 Persimmon Dr",
      "city": "Newark",
      "state": "OH",
      "postalCode": "43055",
      "country": "US"
    }
  },
  "message": "ShipEngine is configured and ready"
}
```

## Features

### Rate Shopping
- Automatically compares rates from all configured carriers
- Returns sorted results (cheapest first)
- Includes delivery time estimates
- Shows which services are guaranteed/trackable

### Address Validation
- Validates and normalizes addresses
- Corrects formatting issues
- Identifies residential vs. commercial addresses
- Prevents undeliverable shipments

### Weight Calculation
- Default weight: 8 oz per item (if not specified)
- Supports multiple weight units:
  - Ounces
  - Pounds
  - Grams
  - Kilograms
- Automatically converts to correct unit for carrier

### Package Dimensions
Default package size:
- Length: 12 inches
- Width: 12 inches
- Height: 6 inches

To customize, edit `backend/src/services/shipEngineService.ts`

## Supported Carriers

ShipEngine supports 40+ carriers worldwide:

**Major US Carriers:**
- USPS (stamps_com)
- UPS (ups)
- FedEx (fedex)
- DHL (dhl_express)

**Regional Carriers:**
- Canada Post (canada_post)
- Royal Mail (royal_mail)
- Australia Post (australia_post)
- And many more...

## Fallback Rates

If the ShipEngine API is unavailable, the system provides fallback rates:

| Service | OH (Local) | Other States |
|---------|-----------|--------------|
| USPS Priority Mail | $7.99 (2 days) | $9.99 (3 days) |
| USPS Priority Express | $22.99 (1 day) | $24.99 (2 days) |

This ensures checkout always works, even during API downtime.

## Testing

### Test with Real Addresses
ShipEngine doesn't have a "sandbox mode" - it uses real carrier rates.

**Test Addresses:**
```javascript
// California
{
  street: "1600 Amphitheatre Parkway",
  city: "Mountain View",
  state: "CA",
  zipCode: "94043",
  country: "US"
}

// New York
{
  street: "350 5th Ave",
  city: "New York",
  state: "NY",
  zipCode: "10118",
  country: "US"
}

// Texas
{
  street: "500 S Ervay St",
  city: "Dallas",
  state: "TX",
  zipCode: "75201",
  country: "US"
}
```

### Testing Checklist
- [ ] Rates return for local address (Ohio)
- [ ] Rates return for out-of-state address
- [ ] Multiple carriers appear in results
- [ ] Rates are sorted by cost
- [ ] Recommended rate is selected
- [ ] Fallback rates work when API is disabled
- [ ] Address validation works
- [ ] Tracking works with real tracking number

## Frontend Integration

Update your checkout component to use the new endpoint:

```typescript
// In your checkout component
const calculateShipping = async (address: Address, items: CartItem[]) => {
  const response = await fetch('/api/v1/shipping/shipengine/rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ address, items })
  });
  
  const data = await response.json();
  
  if (data.success) {
    setShippingRates(data.data.rates);
    setRecommendedRate(data.data.recommendedRate);
  }
};
```

## Troubleshooting

### No Rates Returned

**Problem:** API returns empty array

**Solutions:**
1. ✅ Check API key is valid
2. ✅ Verify address is complete (city, state, zip)
3. ✅ Ensure items have valid weights
4. ✅ Check that carriers are configured in ShipEngine dashboard
5. ✅ Verify origin address is valid

### Authentication Errors

**Problem:** `401 Unauthorized`

**Solutions:**
1. ✅ Check SHIPSTATION_API_KEY in .env file
2. ✅ Ensure no extra spaces in API key
3. ✅ Verify API key is active in ShipEngine dashboard
4. ✅ Restart backend server after updating .env

### Address Validation Fails

**Problem:** Address cannot be validated

**Solutions:**
1. ✅ Use complete street address (no PO Boxes for some carriers)
2. ✅ Verify ZIP code matches city/state
3. ✅ Use 2-letter state codes (CA, NY, not California, New York)
4. ✅ Ensure country code is "US" not "USA"

### Rates Too High

**Problem:** Shipping rates seem expensive

**Solutions:**
1. ✅ Check package weight is correct (not in wrong unit)
2. ✅ Verify dimensions are appropriate
3. ✅ Consider using flat rate services
4. ✅ Negotiate better rates with carriers
5. ✅ Use lighter packaging materials

## Cost Optimization

### Tips to Reduce Shipping Costs:
1. **Accurate Weights:** Measure actual product weights
2. **Right-sized Boxes:** Use smallest box that fits
3. **Bulk Discounts:** Ship multiple items together
4. **Carrier Accounts:** Set up direct accounts for better rates
5. **Rate Shopping:** Always compare all carriers
6. **Regional Carriers:** Consider cheaper regional options

## Security Best Practices

1. ✅ Never expose API key in frontend code
2. ✅ Use environment variables for all credentials
3. ✅ Implement rate limiting on API endpoints
4. ✅ Log all API errors for monitoring
5. ✅ Validate all input before sending to ShipEngine
6. ✅ Use HTTPS for all API calls

## Advanced Configuration

### Custom Origin Address

To change the origin address, edit `backend/src/services/shipEngineService.ts`:

```typescript
const ORIGIN_ADDRESS = {
  name: 'Your Company Name',
  phone: '+1234567890',
  company_name: 'Your Company',
  address_line1: 'Your Street Address',
  city_locality: 'Your City',
  state_province: 'YourState',
  postal_code: 'YourZip',
  country_code: 'US',
  address_residential_indicator: 'no' // 'yes' for residential
};
```

### Specific Carriers Only

To only show specific carriers:

```typescript
const ratesResult = await getShipEngineRates(
  shipToAddress,
  packages,
  {
    carrierIds: ['se-123456'], // USPS only
    // Or use service codes:
    serviceCodes: ['usps_priority_mail', 'ups_ground']
  }
);
```

### Add Signature Confirmation

```typescript
const ratesResult = await getShipEngineRates(
  shipToAddress,
  packages,
  {
    confirmation: 'signature' // or 'adult_signature'
  }
);
```

## Migration from ShipStation

If you're currently using ShipStation:

1. ✅ ShipEngine uses the same API key
2. ✅ Keep existing ShipStation routes for backward compatibility
3. ✅ Gradually migrate frontend to use `/shipengine/rates`
4. ✅ Both services can run simultaneously
5. ✅ Test thoroughly before switching completely

## Support & Resources

- **ShipEngine Documentation:** https://www.shipengine.com/docs/
- **API Reference:** https://www.shipengine.com/docs/rates/
- **Support:** https://www.shipengine.com/support/
- **Community Forum:** https://community.shipengine.com/

## Implementation Summary

### Files Created:
- `backend/src/services/shipEngineService.ts` - Core ShipEngine integration
- `backend/src/controllers/shipEngineController.ts` - API endpoints
- `SHIPENGINE_SETUP_GUIDE.md` - This guide

### Files Modified:
- `backend/src/routes/shippingRoute.ts` - Added ShipEngine routes
- `backend/env.example` - Added configuration example

### Origin Address Configured:
- **Address:** 128 Persimmon Dr
- **City:** Newark
- **State:** OH
- **ZIP:** 43055
- **Type:** Commercial (warehouse)

## Next Steps

1. ✅ Add your ShipEngine API key to `.env`
2. ✅ Add origin phone number (optional)
3. ⏳ Test with real addresses
4. ⏳ Update frontend to use new endpoint
5. ⏳ Configure carrier accounts in ShipEngine dashboard
6. ⏳ Customize package dimensions if needed
7. ⏳ Set up label creation for fulfillment

Your ShipEngine integration is now ready to use! 🚀

## Quick Start

```bash
# 1. Add to .env
SHIPSTATION_API_KEY=your_api_key_here
ORIGIN_PHONE=+1234567890

# 2. Restart backend
npm run dev

# 3. Test endpoint
POST http://localhost:5001/api/v1/shipping/shipengine/rates
```

Happy shipping! 📦

