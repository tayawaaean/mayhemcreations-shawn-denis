/**
 * Webhook Middleware
 * Handles raw body parsing for webhook signature verification
 */

import { Request, Response, NextFunction } from 'express';
import getRawBody from 'raw-body';

/**
 * Middleware to parse raw body for webhook signature verification
 * Stripe requires the raw body to verify webhook signatures
 */
export const webhookBodyParser = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  // Only apply to webhook routes
  if (req.path.includes('/webhook')) {
    try {
      // Parse raw body for webhook signature verification
      req.rawBody = await getRawBody(req, {
        length: req.headers['content-length'],
        limit: '1mb',
        encoding: 'utf8',
      });
    } catch (err: any) {
      return next(err);
    }
  }
  next();
};
