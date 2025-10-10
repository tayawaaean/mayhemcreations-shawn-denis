/**
 * Shipping Controller
 * Handles shipping rate calculations
 */

import { Request, Response } from 'express';
import { 
  getShippingRates, 
  calculateTotalWeight,
  getFallbackRates,
  ShippingRateRequest,
  ShippingRate
} from '../services/shipStationService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

/**
 * Calculate Shipping Rates
 * @route POST /api/v1/shipping/rates
 * @access Private
 */
export const calculateShippingRates = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      address,
      items,
    } = req.body;

    // Validate required fields
    if (!address || !address.city || !address.state || !address.postalCode) {
      res.status(400).json({
        success: false,
        message: 'Shipping address is required',
        code: 'MISSING_ADDRESS',
      });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Cart items are required',
        code: 'MISSING_ITEMS',
      });
      return;
    }

    // Calculate total weight
    const weight = calculateTotalWeight(items);

    logger.info('Calculating shipping rates', {
      userId: req.user?.id,
      destination: `${address.city}, ${address.state} ${address.postalCode}`,
      itemCount: items.length,
      totalWeight: weight,
    });

    // Prepare ShipStation request
    const rateRequest: ShippingRateRequest = {
      fromPostalCode: process.env.SHIPSTATION_FROM_ZIP || '10001', // Your warehouse ZIP
      toState: address.state,
      toCountry: address.country || 'US',
      toPostalCode: address.postalCode,
      toCity: address.city,
      weight,
      residential: true,
    };

    // Get rates from ShipStation
    const ratesResponse = await getShippingRates(rateRequest);

    if (ratesResponse.success && ratesResponse.rates && ratesResponse.rates.length > 0) {
      // Find recommended rate (cheapest with reasonable delivery time)
      const recommendedRate = ratesResponse.rates.find(
        (rate: ShippingRate) => rate.estimatedDeliveryDays && rate.estimatedDeliveryDays <= 5
      ) || ratesResponse.rates[0];

      res.status(200).json({
        success: true,
        data: {
          rates: ratesResponse.rates,
          recommendedRate,
        },
        message: 'Shipping rates calculated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Shipping rates calculated successfully', {
        userId: req.user?.id,
        ratesCount: ratesResponse.rates.length,
        cheapestRate: ratesResponse.rates[0].totalCost,
      });
    } else {
      // Use fallback rates if API fails
      logger.warn('Using fallback shipping rates', {
        userId: req.user?.id,
        reason: ratesResponse.error,
      });

      const fallbackRates = getFallbackRates(address.state);
      
      res.status(200).json({
        success: true,
        data: {
          rates: fallbackRates,
          recommendedRate: fallbackRates[0],
          warning: 'Using estimated shipping rates. Actual rates may vary.',
        },
        message: 'Shipping rates calculated (estimated)',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    logger.error('Calculate shipping rates error:', error);
    
    // Return fallback rates on error
    try {
      const fallbackRates = getFallbackRates(req.body.address?.state || 'CA');
      
      res.status(200).json({
        success: true,
        data: {
          rates: fallbackRates,
          recommendedRate: fallbackRates[0],
          warning: 'Using estimated shipping rates due to temporary service unavailability.',
        },
        message: 'Shipping rates calculated (estimated)',
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Failed to calculate shipping rates',
        code: 'SHIPPING_CALCULATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

