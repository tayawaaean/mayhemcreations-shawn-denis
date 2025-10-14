# ShipEngine Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Add API Key

Edit `backend/.env`:
```env
SHIPSTATION_API_KEY=your_api_key_here
```

### Step 2: Restart Backend

```bash
cd backend
npm run dev
```

### Step 3: Test It!

**Using Postman or curl:**

```bash
POST http://localhost:5001/api/v1/shipping/shipengine/rates
Authorization: Bearer your_token
Content-Type: application/json

{
  "address": {
    "street": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90001"
  },
  "items": [
    {
      "id": "test_1",
      "name": "Test Item",
      "quantity": 1,
      "price": 29.99
    }
  ]
}
```

## 📍 Origin Address (Pre-Configured)

**Your warehouse address:**
- 128 Persimmon Dr
- Newark, OH 43055
- Commercial address

## 🎯 Quick API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/shipping/shipengine/rates` | POST | Calculate shipping rates |
| `/shipping/shipengine/validate-address` | POST | Validate an address |
| `/shipping/shipengine/track/:carrier/:number` | GET | Track a shipment |
| `/shipping/shipengine/status` | GET | Check if configured |

## 💻 Frontend Usage

```typescript
import { ShipEngineApiService } from '@/shared/shipEngineApiService';

// Calculate rates
const response = await ShipEngineApiService.calculateRates(
  shippingAddress,
  cartItems
);

// Use the rates
if (response.success) {
  setRates(response.data.rates);
  setRecommended(response.data.recommendedRate);
}
```

## 🛠️ Default Configuration

| Setting | Value |
|---------|-------|
| **Default Item Weight** | 8 ounces |
| **Package Dimensions** | 12" x 12" x 6" |
| **Carriers** | All available (USPS, UPS, FedEx, DHL, etc.) |
| **Rate Sorting** | By cost (cheapest first) |
| **Fallback Rates** | $7.99-$9.99 (Priority), $22.99-$24.99 (Express) |

## ✅ What's Included

- ✅ Real-time rates from multiple carriers
- ✅ Automatic rate comparison
- ✅ Delivery time estimates
- ✅ Address validation
- ✅ Shipment tracking
- ✅ Fallback rates (if API fails)
- ✅ TypeScript support
- ✅ Complete error handling

## 📦 Supported Carriers

- USPS
- UPS
- FedEx
- DHL Express
- OnTrac
- LSO
- 40+ more...

## 🔧 Customization

### Change Origin Address

Edit `backend/src/services/shipEngineService.ts` (lines 30-40)

### Change Default Weight

Edit `backend/src/services/shipEngineService.ts` (line 255)

### Change Package Dimensions

Edit `backend/src/services/shipEngineService.ts` (lines 290-295)

## 📚 Full Documentation

- **Complete Guide:** `SHIPENGINE_SETUP_GUIDE.md`
- **Implementation Summary:** `SHIPENGINE_IMPLEMENTATION_COMPLETE.md`
- **ShipEngine Docs:** https://www.shipengine.com/docs/rates/

## ❓ Troubleshooting

**No rates returned?**
- Check API key in `.env`
- Verify address is complete
- Ensure backend is running
- Check logs: `backend/logs/combined.log`

**401 Unauthorized?**
- Verify API key is correct
- Restart backend after adding key
- Check for extra spaces in `.env`

**Rates too expensive?**
- Verify item weights are correct
- Check package dimensions
- Consider carrier accounts for discounts

## 🎉 You're Ready!

Just add your API key and start shipping!

```bash
# Quick test command
curl -X POST http://localhost:5001/api/v1/shipping/shipengine/status \
  -H "Authorization: Bearer your_token"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "origin": {
      "address": "128 Persimmon Dr",
      "city": "Newark",
      "state": "OH",
      "postalCode": "43055"
    }
  }
}
```

---

**Need help?** Open `SHIPENGINE_SETUP_GUIDE.md` for detailed instructions!

