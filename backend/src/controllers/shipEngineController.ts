/**
 * ShipEngine Controller
 * Handles ShipEngine API requests for shipping rates and label creation
 */

import { Request, Response } from 'express';
import {
  getShipEngineRates,
  convertToShipEngineAddress,
  createPackageFromItems,
  getFallbackShippingRates,
  shipEngineService,
} from '../services/shipEngineService';
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
 * Calculate Shipping Rates using ShipEngine
 * @route POST /api/v1/shipping/shipengine/rates
 * @access Private
 */
export const calculateShipEngineRates = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { address, items } = req.body;

    // Validate required fields
    if (!address || !address.city || !address.state || !address.postalCode && !address.zipCode) {
      res.status(400).json({
        success: false,
        message: 'Complete shipping address is required (city, state, postal code)',
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

    logger.info('Calculating ShipEngine shipping rates', {
      userId: req.user?.id,
      destination: `${address.city}, ${address.state} ${address.postalCode || address.zipCode}`,
      itemCount: items.length,
    });

    // Convert address to ShipEngine format
    const shipToAddress = convertToShipEngineAddress(address);

    // Create package from items
    const packages = [createPackageFromItems(items)];

    logger.info('ShipEngine request prepared', {
      packages: packages.map(p => ({
        weight: p.weight,
        dimensions: p.dimensions,
      })),
      destination: shipToAddress,
    });

    // Get rates from ShipEngine
    const ratesResult = await getShipEngineRates(shipToAddress, packages);

    if (ratesResult.success && ratesResult.rates && ratesResult.rates.length > 0) {
      // Find recommended rate (best balance of cost and speed)
      const recommendedRate =
        ratesResult.rates.find(
          rate =>
            rate.estimatedDeliveryDays &&
            rate.estimatedDeliveryDays <= 5 &&
            rate.estimatedDeliveryDays >= 2
        ) || ratesResult.rates[0]; // Default to cheapest if no suitable rate found

      res.status(200).json({
        success: true,
        data: {
          rates: ratesResult.rates,
          recommendedRate,
          origin: {
            city: 'Newark',
            state: 'OH',
            postalCode: '43055',
          },
        },
        message: 'Shipping rates calculated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('ShipEngine rates calculated successfully', {
        userId: req.user?.id,
        ratesCount: ratesResult.rates.length,
        cheapestRate: ratesResult.rates[0].totalCost,
        recommendedRate: recommendedRate.totalCost,
        carriers: [...new Set(ratesResult.rates.map(r => r.carrier))],
      });
    } else {
      // Use fallback rates if API fails
      logger.warn('Using fallback shipping rates', {
        userId: req.user?.id,
        reason: ratesResult.error,
      });

      const fallbackRates = getFallbackShippingRates(address.state);

      res.status(200).json({
        success: true,
        data: {
          rates: fallbackRates,
          recommendedRate: fallbackRates[0],
          warning: 'Using estimated shipping rates. Actual rates may vary.',
          origin: {
            city: 'Newark',
            state: 'OH',
            postalCode: '43055',
          },
        },
        message: 'Shipping rates calculated (estimated)',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    logger.error('Calculate ShipEngine shipping rates error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    // Return fallback rates on error
    try {
      const fallbackRates = getFallbackShippingRates(req.body.address?.state || 'OH');

      res.status(200).json({
        success: true,
        data: {
          rates: fallbackRates,
          recommendedRate: fallbackRates[0],
          warning:
            'Using estimated shipping rates due to temporary service unavailability.',
          origin: {
            city: 'Newark',
            state: 'OH',
            postalCode: '43055',
          },
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

/**
 * Validate address using ShipEngine
 * @route POST /api/v1/shipping/shipengine/validate-address
 * @access Private
 */
export const validateAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { address } = req.body;

    if (!address) {
      res.status(400).json({
        success: false,
        message: 'Address is required',
        code: 'MISSING_ADDRESS',
      });
      return;
    }

    // Convert to ShipEngine format
    const shipEngineAddress = convertToShipEngineAddress(address);

    // Validate with ShipEngine
    const validationResult = await shipEngineService.validateAddress(
      shipEngineAddress
    );

    res.status(200).json({
      success: true,
      data: validationResult,
      message: 'Address validated successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Address validated successfully', {
      userId: req.user?.id,
      status: validationResult.status,
    });
  } catch (error: any) {
    logger.error('Address validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate address',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get available carriers from ShipEngine
 * @route GET /api/v1/shipping/shipengine/carriers
 * @access Private (Admin only)
 */
export const getCarriers = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const carriers = await shipEngineService.getCarriers();

    res.status(200).json({
      success: true,
      data: carriers,
      message: 'Carriers retrieved successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Carriers retrieved successfully', {
      userId: req.user?.id,
      carriersCount: carriers.length,
    });
  } catch (error: any) {
    logger.error('Get carriers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve carriers',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get carrier services from ShipEngine
 * @route GET /api/v1/shipping/shipengine/carriers/:carrierId/services
 * @access Private (Admin only)
 */
export const getCarrierServices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { carrierId } = req.params;

    if (!carrierId) {
      res.status(400).json({
        success: false,
        message: 'Carrier ID is required',
        code: 'MISSING_CARRIER_ID',
      });
      return;
    }

    const services = await shipEngineService.getCarrierServices(carrierId);

    res.status(200).json({
      success: true,
      data: services,
      message: 'Services retrieved successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Carrier services retrieved successfully', {
      userId: req.user?.id,
      carrierId,
      servicesCount: services.length,
    });
  } catch (error: any) {
    logger.error('Get carrier services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve carrier services',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Track a shipment using ShipEngine
 * @route GET /api/v1/shipping/shipengine/track/:carrierCode/:trackingNumber
 * @access Private
 */
export const trackShipment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { carrierCode, trackingNumber } = req.params;

    if (!carrierCode || !trackingNumber) {
      res.status(400).json({
        success: false,
        message: 'Carrier code and tracking number are required',
        code: 'MISSING_TRACKING_INFO',
      });
      return;
    }

    const trackingInfo = await shipEngineService.trackShipment(
      carrierCode,
      trackingNumber
    );

    res.status(200).json({
      success: true,
      data: trackingInfo,
      message: 'Tracking information retrieved successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Shipment tracked successfully', {
      userId: req.user?.id,
      carrierCode,
      trackingNumber,
    });
  } catch (error: any) {
    logger.error('Track shipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tracking information',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Test ShipEngine API connection using address validation
 * @route GET /api/v1/shipping/shipengine/test
 * @access Private (Admin only)
 */
export const testShipEngineConnection = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    logger.info('Testing ShipEngine API connection', {
      userId: req.user?.id,
    });

    const testResult = await shipEngineService.testConnection();

    res.status(testResult.success ? 200 : 400).json({
      ...testResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('ShipEngine connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing ShipEngine API connection',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Check ShipEngine configuration status
 * @route GET /api/v1/shipping/shipengine/status
 * @access Private (Admin only)
 */
export const getShipEngineStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const isConfigured = shipEngineService.isConfigured();

    res.status(200).json({
      success: true,
      data: {
        configured: isConfigured,
        origin: {
          address: '128 Persimmon Dr',
          city: 'Newark',
          state: 'OH',
          postalCode: '43055',
          country: 'US',
        },
      },
      message: isConfigured
        ? 'ShipEngine is configured and ready'
        : 'ShipEngine is not configured - API key missing',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('ShipEngine status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ShipEngine status',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

export default {
  calculateShipEngineRates,
  validateAddress,
  getCarriers,
  getCarrierServices,
  trackShipment,
  testShipEngineConnection,
  getShipEngineStatus,
};

