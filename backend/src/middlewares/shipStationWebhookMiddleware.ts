/**
 * ShipEngine Webhook Middleware
 * Handles authentication and verification for ShipEngine webhooks
 * 
 * Note: ShipEngine webhooks don't use signature verification like Stripe.
 * Instead, they use User-Agent header verification and IP whitelisting.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Verify ShipEngine webhook authenticity
 * ShipEngine webhooks use User-Agent header verification
 */
export const verifyShipEngineWebhook = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userAgent = req.headers['user-agent'] as string;
    
    // Verify the request is from ShipEngine
    if (!userAgent || !userAgent.includes('ShipEngine')) {
      logger.warn('Invalid webhook request - not from ShipEngine', {
        userAgent: userAgent,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      
      return res.status(403).json({
        success: false,
        message: 'Invalid webhook source - request must come from ShipEngine',
        code: 'INVALID_SOURCE',
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful verification
    const clientIP = req.ip || req.connection.remoteAddress;
    logger.info('ShipEngine webhook request verified', {
      userAgent: userAgent,
      clientIP: clientIP,
      timestamp: new Date().toISOString(),
    });

    return next();

  } catch (error: any) {
    logger.error('Error verifying ShipEngine webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during webhook verification',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional: IP whitelist verification for additional security
 * Uncomment and configure if you want to restrict webhook access to specific IPs
 */
export const verifyShipEngineIP = (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // ShipEngine webhooks typically come from AWS IP ranges
    // You can add specific IP ranges here for additional security
    const allowedIPs: string[] = [
      // Add ShipEngine IP ranges here if needed
      // '54.240.0.0/16', // Example AWS range
    ];

    // If no IPs are configured, allow all (for development)
    if (allowedIPs.length === 0) {
      logger.debug('No IP whitelist configured, allowing all IPs');
      return next();
    }

    // Check if client IP is in allowed list
    const isAllowed = allowedIPs.some(ipRange => {
      // Simple IP range check (you might want to use a proper IP range library)
      return clientIP?.startsWith(ipRange.split('/')[0].split('.').slice(0, 2).join('.'));
    });

    if (!isAllowed) {
      logger.warn('Webhook request from unauthorized IP', {
        clientIP: clientIP,
        allowedIPs: allowedIPs,
      });
      
      return res.status(403).json({
        success: false,
        message: 'Unauthorized IP address',
        code: 'UNAUTHORIZED_IP',
        timestamp: new Date().toISOString(),
      });
    }

    return next();

  } catch (error: any) {
    logger.error('Error verifying ShipEngine webhook IP:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during IP verification',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Combined middleware for ShipEngine webhooks
 */
export const shipEngineWebhookMiddleware = [
  verifyShipEngineWebhook,
  // verifyShipEngineIP, // Uncomment for IP whitelisting
];