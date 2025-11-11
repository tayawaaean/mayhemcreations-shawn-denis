/**
 * Webhook Middleware
 * Handles raw body parsing for webhook signature verification
 */

import { Request, Response, NextFunction } from 'express';
import getRawBody from 'raw-body';
import { logger } from '../utils/logger';

/**
 * Middleware to parse raw body for webhook signature verification
 * Stripe requires the raw body to verify webhook signatures
 * 
 * IMPORTANT: This middleware must be placed BEFORE any body parsing middleware
 * in the Express app to ensure the raw body stream is still available.
 */
export const webhookBodyParser = async (req: any, res: Response, next: NextFunction): Promise<void> => {
  // Check if this is a webhook route (stripe, paypal, shipstation, etc.)
  const isWebhookRoute = req.path.includes('/webhook') || req.path.includes('/webhooks');
  
  if (isWebhookRoute) {
    try {
      // Log incoming webhook request for debugging
      logger.info('Webhook body parser: Processing webhook request', {
        path: req.path,
        method: req.method,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        hasRawBody: !!req.rawBody,
      });

      // Check if raw body was already parsed (shouldn't happen, but safety check)
      if (req.rawBody) {
        logger.warn('Webhook body parser: rawBody already exists, skipping parsing', {
          path: req.path,
        });
        return next();
      }

      // Check if request stream has been consumed
      if (req.readableEnded) {
        logger.error('Webhook body parser: Request stream already consumed', {
          path: req.path,
        });
        res.status(400).json({
          success: false,
          message: 'Request body stream already consumed',
          code: 'BODY_CONSUMED',
        });
        return;
      }

      // Parse raw body for webhook signature verification
      // This must be done BEFORE any JSON parsing middleware
      const contentLength = req.headers['content-length'] 
        ? parseInt(req.headers['content-length'], 10) 
        : undefined;

      req.rawBody = await getRawBody(req, {
        length: contentLength,
        limit: '1mb',
        encoding: 'utf8',
      });

      logger.info('Webhook body parser: Successfully parsed raw body', {
        path: req.path,
        rawBodyLength: req.rawBody.length,
        rawBodyType: typeof req.rawBody,
      });

      // Prevent body parsing middleware from parsing this request
      // by marking it as already parsed
      req._body = true;
    } catch (err: any) {
      logger.error('Webhook body parser: Error parsing raw body', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
      });
      res.status(400).json({
        success: false,
        message: 'Failed to parse webhook body',
        code: 'BODY_PARSE_ERROR',
        error: err.message,
      });
      return;
    }
  }
  
  next();
};
