/**
 * Refund Service
 * Handles refund processing, payment gateway integration, and inventory restoration
 */

import Stripe from 'stripe';
import { RefundRequest } from '../models/refundRequestModel';
import { OrderReview } from '../models/orderReviewModel';
import { Payment } from '../models/paymentModel';
import { User } from '../models/userModel';
import Product from '../models/productModel';
import Variant from '../models/variantModel';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { logPaymentTransaction } from './paymentLogService';

// Initialize Stripe with API key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

// PayPal SDK configuration
import paypal from '@paypal/checkout-server-sdk';

// Initialize PayPal client
const paypalEnvironment = process.env.PAYPAL_MODE === 'live'
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID || '',
      process.env.PAYPAL_CLIENT_SECRET || ''
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID || '',
      process.env.PAYPAL_CLIENT_SECRET || ''
    );

const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

export class RefundService {
  /**
   * Create a new refund request from customer
   * Validates eligibility and creates the request in pending status
   */
  static async createRefundRequest(data: {
    orderId: number;
    userId: number;
    reason: string;
    description?: string;
    refundType?: 'full' | 'partial';
    refundAmount?: number;
    refundItems?: any[];
    imagesUrls?: string[];
  }): Promise<{ success: boolean; refundRequest?: RefundRequest; message: string }> {
    try {
      // Fetch the order with payment details
      const order = await OrderReview.findByPk(data.orderId, {
        include: [
          { model: User, as: 'user' },
          { model: Payment, as: 'payments' }
        ]
      });

      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Verify order belongs to user
      if (order.userId !== data.userId) {
        return { success: false, message: 'Unauthorized: Order does not belong to this user' };
      }

      // Check eligibility
      const eligibility = await this.validateRefundEligibility(order);
      if (!eligibility.eligible) {
        return { success: false, message: eligibility.reason || 'Order is not eligible for refund' };
      }

      // Check if refund already exists
      const existingRefund = await RefundRequest.findOne({
        where: { orderId: data.orderId, status: ['pending', 'under_review', 'approved', 'processing'] }
      });

      if (existingRefund) {
        return { success: false, message: 'A refund request is already pending for this order' };
      }

      // Get payment information (cast to any to access included associations)
      const orderWithIncludes = order as any;
      const payment = orderWithIncludes.payments && orderWithIncludes.payments.length > 0 
        ? orderWithIncludes.payments[0] 
        : null;

      // Calculate refund amount
      const refundAmount = data.refundAmount || parseFloat(order.total.toString());
      const refundType = data.refundType || 'full';

      // Create refund request
      const refundRequest = await RefundRequest.create({
        orderId: data.orderId,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        userId: data.userId,
        paymentId: payment?.id || null,
        refundType: refundType,
        refundAmount: refundAmount,
        originalAmount: parseFloat(order.total.toString()),
        currency: 'USD',
        reason: data.reason as any,
        description: data.description || null,
        customerEmail: orderWithIncludes.user?.email || '',
        customerName: `${orderWithIncludes.user?.firstName || ''} ${orderWithIncludes.user?.lastName || ''}`.trim(),
        imagesUrls: data.imagesUrls || null,
        status: 'pending',
        refundMethod: 'original_payment',
        paymentProvider: payment?.provider || null,
        refundItems: data.refundItems || null,
        inventoryRestored: false,
        requestedAt: new Date(),
      });

      // Update order refund status
      await sequelize.query(
        `UPDATE order_reviews SET refund_status = ?, refund_requested_at = ? WHERE id = ?`,
        {
          replacements: [refundType === 'full' ? 'requested' : 'requested', new Date(), order.id]
        }
      );

      // Log the refund request in payment logs
      await logPaymentTransaction({
        orderId: data.orderId,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        customerId: data.userId,
        customerName: `${orderWithIncludes.user?.firstName || ''} ${orderWithIncludes.user?.lastName || ''}`.trim() || 'Unknown',
        customerEmail: orderWithIncludes.user?.email || 'unknown@example.com',
        amount: -Number(refundAmount), // Negative amount to indicate refund
        currency: 'USD',
        provider: (payment?.provider as 'stripe' | 'paypal') || 'stripe',
        paymentMethod: payment?.paymentMethod || 'digital_wallet',
        status: 'pending',
        transactionId: `REFUND_REQ_${refundRequest.id}_${Date.now()}`,
        providerTransactionId: `REFUND_REQUEST_${refundRequest.id}`,
        gatewayResponse: {
          refundRequestId: refundRequest.id,
          refundType: refundType,
          reason: data.reason,
          description: data.description
        },
        metadata: {
          refundRequestId: refundRequest.id,
          refundType: refundType,
          refundItems: data.refundItems
        },
        notes: `Refund request created: ${this.getReasonLabel(data.reason)}`
      });

      logger.info(`Refund request created: ${refundRequest.id} for order ${order.orderNumber}`);

      return {
        success: true,
        refundRequest,
        message: 'Refund request submitted successfully'
      };
    } catch (error: any) {
      logger.error('Error creating refund request:', error);
      return {
        success: false,
        message: 'Failed to create refund request: ' + error.message
      };
    }
  }

  /**
   * Validate if an order is eligible for refund
   * Checks time limits, order status, and other business rules
   */
  static async validateRefundEligibility(order: OrderReview): Promise<{ eligible: boolean; reason?: string }> {
    // Check if order is already fully refunded
    if (order.paymentStatus === 'refunded') {
      return { eligible: false, reason: 'Order has already been refunded' };
    }

    // Check if order has been delivered or is in a refundable state
    const refundableStatuses = ['delivered', 'shipped', 'in-production', 'ready-for-checkout'];
    if (!refundableStatuses.includes(order.status)) {
      return { eligible: false, reason: 'Order is not in a refundable state' };
    }

    // Check time limit (30 days from delivery for standard, 60 for damaged)
    const timeLimitDays = parseInt(process.env.REFUND_TIME_LIMIT_DAYS || '30');
    const orderDate = order.deliveredAt || order.shippedAt || order.createdAt;
    const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceOrder > timeLimitDays) {
      return { eligible: false, reason: `Refund window has expired (${timeLimitDays} days limit)` };
    }

    // Order is eligible
    return { eligible: true };
  }

  /**
   * Approve a refund request and initiate payment processing
   * Admin action - processes the refund through payment gateway
   */
  static async approveRefund(
    refundId: number,
    adminNotes?: string,
    adminUserId?: number,
    manualCaptureId?: string
  ): Promise<{ success: boolean; message: string; refund?: RefundRequest }> {
    const transaction = await sequelize.transaction();

    try {
      // Fetch refund request with related data
      const refund = await RefundRequest.findByPk(refundId, {
        include: [
          { model: OrderReview, as: 'order' },
          { model: Payment, as: 'payment' },
          { model: User, as: 'user' }
        ],
        transaction
      });

      if (!refund) {
        await transaction.rollback();
        return { success: false, message: 'Refund request not found' };
      }

      // Verify refund can be approved
      if (!refund.canBeApproved()) {
        await transaction.rollback();
        return { success: false, message: `Refund cannot be approved in ${refund.status} status` };
      }

      // Check if this is a retry of a failed refund
      const isRetry = refund.status === 'failed';
      const retryNote = isRetry ? '\n\n[RETRY ATTEMPT] Retrying failed refund with ' + 
        (manualCaptureId ? 'manual capture ID' : 'automatic capture ID lookup') : '';

      // Update refund status to processing
      await refund.update({
        status: 'processing',
        adminNotes: (adminNotes || refund.adminNotes || '') + retryNote,
        reviewedAt: new Date(),
        processedAt: new Date(),
        failedAt: null // Clear failed timestamp on retry
      }, { transaction });

      await transaction.commit();

      // Process refund with payment gateway (outside transaction for safety)
      const processResult = await this.processPaymentGatewayRefund(refund, manualCaptureId);

      if (!processResult.success) {
        // Mark as failed
        await refund.update({
          status: 'failed',
          failedAt: new Date(),
          adminNotes: (refund.adminNotes || '') + '\n\nFailed: ' + processResult.message
        });

        // Log failed refund in payment logs
        await logPaymentTransaction({
          orderId: refund.orderId,
          orderNumber: refund.orderNumber,
          customerId: refund.userId,
          customerName: refund.customerName,
          customerEmail: refund.customerEmail,
          amount: -Number(refund.refundAmount), // Negative for refund
          currency: refund.currency,
          provider: refund.paymentProvider as 'stripe' | 'paypal' || 'stripe',
          paymentMethod: 'digital_wallet',
          status: 'failed',
          transactionId: `REFUND_FAILED_${refund.id}_${Date.now()}`,
          providerTransactionId: processResult.refundId || `REFUND_FAILED_${refund.id}`,
          gatewayResponse: processResult.response,
          metadata: {
            refundRequestId: refund.id,
            refundType: refund.refundType,
            failureReason: processResult.message
          },
          notes: `Refund processing failed: ${processResult.message}`
        });

        return {
          success: false,
          message: 'Refund processing failed: ' + processResult.message,
          refund
        };
      }

      // Mark as completed
      await refund.update({
        status: 'completed',
        completedAt: new Date(),
        providerRefundId: processResult.refundId,
        providerResponse: processResult.response
      });

      // Log successful refund in payment logs
      await logPaymentTransaction({
        orderId: refund.orderId,
        orderNumber: refund.orderNumber,
        customerId: refund.userId,
        customerName: refund.customerName,
        customerEmail: refund.customerEmail,
        amount: -Number(refund.refundAmount), // Negative amount for refund
        currency: refund.currency,
        provider: refund.paymentProvider as 'stripe' | 'paypal' || 'stripe',
        paymentMethod: 'digital_wallet',
        status: 'refunded',
        transactionId: `REFUND_COMPLETED_${refund.id}_${Date.now()}`,
        providerTransactionId: processResult.refundId || `REFUND_${refund.id}`,
        gatewayResponse: processResult.response,
        fees: 0, // Refunds typically don't have fees
        netAmount: -Number(refund.refundAmount),
        metadata: {
          refundRequestId: refund.id,
          refundType: refund.refundType,
          reason: refund.reason,
          inventoryRestored: refund.inventoryRestored
        },
        notes: `Refund completed successfully: ${this.getReasonLabel(refund.reason)}`
      });

      // Restore inventory
      await this.restoreInventory(refund);

      // Update order status
      await this.updateOrderRefundStatus(refund);

      logger.info(`Refund approved and processed: ${refund.id}`);

      return {
        success: true,
        message: 'Refund approved and processed successfully',
        refund
      };
    } catch (error: any) {
      await transaction.rollback();
      logger.error('Error approving refund:', error);
      return {
        success: false,
        message: 'Failed to approve refund: ' + error.message
      };
    }
  }

  /**
   * Reject a refund request
   * Admin action - denies the refund with reason
   */
  static async rejectRefund(
    refundId: number,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string; refund?: RefundRequest }> {
    try {
      const refund = await RefundRequest.findByPk(refundId, {
        include: [{ model: OrderReview, as: 'order' }]
      });

      if (!refund) {
        return { success: false, message: 'Refund request not found' };
      }

      if (!refund.canBeApproved()) {
        return { success: false, message: `Refund cannot be rejected in ${refund.status} status` };
      }

      await refund.update({
        status: 'rejected',
        rejectionReason,
        adminNotes: adminNotes || refund.adminNotes,
        reviewedAt: new Date()
      });

      // Log rejected refund in payment logs
      await logPaymentTransaction({
        orderId: refund.orderId,
        orderNumber: refund.orderNumber,
        customerId: refund.userId,
        customerName: refund.customerName,
        customerEmail: refund.customerEmail,
        amount: -Number(refund.refundAmount), // Negative for refund
        currency: refund.currency,
        provider: refund.paymentProvider as 'stripe' | 'paypal' || 'stripe',
        paymentMethod: 'digital_wallet',
        status: 'cancelled',
        transactionId: `REFUND_REJECTED_${refund.id}_${Date.now()}`,
        providerTransactionId: `REFUND_REJECTED_${refund.id}`,
        metadata: {
          refundRequestId: refund.id,
          refundType: refund.refundType,
          reason: refund.reason,
          rejectionReason: rejectionReason
        },
        notes: `Refund request rejected: ${rejectionReason}`
      });

      // Update order refund status
      await sequelize.query(
        `UPDATE order_reviews SET refund_status = ? WHERE id = ?`,
        {
          replacements: ['none', refund.orderId]
        }
      );

      logger.info(`Refund rejected: ${refund.id}`);

      return {
        success: true,
        message: 'Refund request rejected',
        refund
      };
    } catch (error: any) {
      logger.error('Error rejecting refund:', error);
      return {
        success: false,
        message: 'Failed to reject refund: ' + error.message
      };
    }
  }

  /**
   * Cancel a refund request (customer or admin action)
   */
  static async cancelRefund(
    refundId: number,
    userId?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const refund = await RefundRequest.findByPk(refundId);

      if (!refund) {
        return { success: false, message: 'Refund request not found' };
      }

      // Verify user authorization if userId provided
      if (userId && refund.userId !== userId) {
        return { success: false, message: 'Unauthorized to cancel this refund' };
      }

      if (!refund.canBeCancelled()) {
        return { success: false, message: `Refund cannot be cancelled in ${refund.status} status` };
      }

      await refund.update({
        status: 'cancelled'
      });

      logger.info(`Refund cancelled: ${refund.id}`);

      return {
        success: true,
        message: 'Refund request cancelled successfully'
      };
    } catch (error: any) {
      logger.error('Error cancelling refund:', error);
      return {
        success: false,
        message: 'Failed to cancel refund: ' + error.message
      };
    }
  }

  /**
   * Process refund through payment gateway (Stripe or PayPal)
   */
  private static async processPaymentGatewayRefund(
    refund: RefundRequest,
    manualCaptureId?: string
  ): Promise<{ success: boolean; message?: string; refundId?: string; response?: any }> {
    try {
      // Fetch payment if not included
      const refundWithPayment = refund as any;
      const payment = refundWithPayment.payment || await Payment.findByPk(refund.paymentId!);
      
      if (!payment) {
        return { success: false, message: 'No payment information found for this order' };
      }

      const provider = refund.paymentProvider;

      if (provider === 'stripe') {
        return await this.processStripeRefund(refund);
      } else if (provider === 'paypal') {
        return await this.processPayPalRefund(refund, manualCaptureId);
      } else {
        return { success: false, message: 'Unsupported payment provider: ' + provider };
      }
    } catch (error: any) {
      logger.error('Error processing payment gateway refund:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Process Stripe refund
   */
  private static async processStripeRefund(
    refund: RefundRequest
  ): Promise<{ success: boolean; message?: string; refundId?: string; response?: any }> {
    try {
      // Fetch order to get payment intent ID
      const order = await OrderReview.findByPk(refund.orderId);
      
      if (!order || !order.paymentIntentId) {
        return { success: false, message: 'No Stripe payment intent ID found' };
      }

      // Create refund in Stripe
      const stripeRefund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount: Math.round(Number(refund.refundAmount) * 100), // Convert to cents
        reason: this.mapReasonToStripeReason(refund.reason),
        metadata: {
          refund_request_id: refund.id.toString(),
          order_number: refund.orderNumber,
          customer_email: refund.customerEmail
        }
      });

      logger.info(`Stripe refund created: ${stripeRefund.id} for refund request ${refund.id}`);

      return {
        success: true,
        refundId: stripeRefund.id,
        response: stripeRefund
      };
    } catch (error: any) {
      logger.error('Stripe refund error:', error);
      return {
        success: false,
        message: 'Stripe refund failed: ' + error.message
      };
    }
  }

  /**
   * Process PayPal refund
   * Automatically processes refund through PayPal API
   */
  private static async processPayPalRefund(
    refund: RefundRequest,
    manualCaptureId?: string
  ): Promise<{ success: boolean; message?: string; refundId?: string; response?: any }> {
    try {
      let captureId = manualCaptureId; // Use manual capture ID if provided

      // If manual capture ID not provided, try to find it
      if (!captureId) {
        // Get order to find PayPal capture ID
        const order = await OrderReview.findByPk(refund.orderId);
        
        if (!order) {
          logger.error('Order not found for PayPal refund:', refund.orderId);
          return {
            success: false,
            message: 'Order not found - cannot process refund'
          };
        }

        captureId = order.paymentIntentId || undefined;

        // If capture ID is not in the order, try to get it from the payments table
        if (!captureId) {
          logger.warn('PayPal capture ID not found in order, checking payments table:', {
            refundId: refund.id,
            orderId: refund.orderId,
            hasTransactionId: !!order.transactionId,
            transactionId: order.transactionId
          });

          try {
            const { sequelize } = await import('../config/database');
            const [paymentRecords] = await sequelize.query(
              `SELECT provider_transaction_id, gateway_response 
               FROM payments 
               WHERE order_id = ? AND provider = 'paypal' AND status = 'completed'
               ORDER BY id DESC LIMIT 1`,
              { replacements: [refund.orderId] }
            );

            const payment = paymentRecords[0] as any;
            if (payment?.provider_transaction_id) {
              captureId = payment.provider_transaction_id;
              logger.info('Found PayPal capture ID in payments table:', captureId);
            } else if (payment?.gateway_response) {
              try {
                const gatewayData = JSON.parse(payment.gateway_response);
                captureId = gatewayData.paypalCaptureId || gatewayData.captureId;
                if (captureId) {
                  logger.info('Found PayPal capture ID in gateway response:', captureId);
                }
              } catch (e) {
                logger.warn('Failed to parse gateway response:', e);
              }
            }
          } catch (error) {
            logger.error('Error fetching PayPal capture ID from payments table:', error);
          }
        }
      }

      // If still no capture ID, return error with helpful message
      if (!captureId) {
        logger.error('No PayPal capture ID found anywhere for refund:', {
          refundId: refund.id,
          orderId: refund.orderId,
          orderNumber: refund.orderNumber
        });
        return {
          success: false,
          message: 'MANUAL_REFUND_REQUIRED: PayPal capture ID not found. Please:\n1. Log into your PayPal dashboard\n2. Find the transaction for this order\n3. Process the refund manually\n4. Update the refund status in the admin panel\n\nAlternatively, you can provide the PayPal capture ID manually when approving the refund.'
        };
      }

      logger.info('Processing PayPal refund with capture ID:', {
        refundId: refund.id,
        orderId: refund.orderId,
        captureId: captureId,
        amount: refund.refundAmount,
        isManual: !!manualCaptureId
      });

      // Create PayPal refund request using the actual PayPal capture ID
      const request = new paypal.payments.CapturesRefundRequest(captureId);
      request.requestBody({
        amount: {
          value: Number(refund.refundAmount).toFixed(2),
          currency_code: refund.currency || 'USD'
        },
        invoice_id: refund.orderNumber,
        note_to_payer: `Refund for order ${refund.orderNumber}. Reason: ${this.getReasonLabel(refund.reason)}`
      });

      // Execute refund via PayPal API
      const paypalRefund = await paypalClient.execute(request);
      
      logger.info(`PayPal refund created: ${paypalRefund.result.id} for refund request ${refund.id}`);

      return {
        success: true,
        refundId: paypalRefund.result.id,
        response: paypalRefund.result
      };
    } catch (error: any) {
      // Log full error details for debugging
      logger.error('PayPal refund error:', error?.message ? error : JSON.stringify(error));
      
      // Check if error is from PayPal API (contains statusCode or name)
      const errorName = error?.name || error?.details?.[0]?.issue || '';
      const errorMessage = error?.message || '';
      
      // Handle RESOURCE_NOT_FOUND errors (invalid capture ID)
      if (errorName === 'RESOURCE_NOT_FOUND' || errorMessage.includes('RESOURCE_NOT_FOUND')) {
        return {
          success: false,
          message: 'MANUAL_REFUND_REQUIRED: PayPal capture ID is invalid or does not exist. This usually happens when:\n\n' +
            '1. The transaction was made in a different PayPal environment (sandbox vs. live)\n' +
            '2. The capture ID is incorrect\n' +
            '3. The transaction was already refunded\n\n' +
            'SOLUTION:\n' +
            '1. Log into your PayPal dashboard (sandbox or live depending on your environment)\n' +
            '2. Search for the transaction by order number or customer email\n' +
            '3. Find the correct Capture ID in the transaction details\n' +
            '4. Either:\n' +
            '   a) Process the refund manually in PayPal, then mark this request as completed\n' +
            '   b) Copy the correct Capture ID and provide it when approving this refund request\n\n' +
            `PayPal Error: ${errorMessage}`,
          response: error
        };
      }
      
      // If error is due to missing transaction, suggest manual processing
      if (errorMessage?.includes('transaction') || errorMessage?.includes('capture')) {
        return {
          success: false,
          message: 'MANUAL_REFUND_REQUIRED: PayPal transaction not found. Please process refund manually in PayPal dashboard and update the status here.',
          response: error
        };
      }
      
      return {
        success: false,
        message: 'PayPal refund failed: ' + (errorMessage || 'Unknown error'),
        response: error
      };
    }
  }

  /**
   * Helper method to get human-readable reason label
   */
  private static getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      damaged_defective: 'Product damaged or defective',
      wrong_item: 'Wrong item received',
      not_as_described: 'Item not as described',
      changed_mind: 'Customer changed mind',
      duplicate_order: 'Duplicate order',
      shipping_delay: 'Shipping delay',
      quality_issues: 'Quality issues',
      other: 'Other reason'
    };
    return labels[reason] || reason;
  }

  /**
   * Map refund reason to Stripe refund reason
   */
  private static mapReasonToStripeReason(reason: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' {
    const mapping: Record<string, 'duplicate' | 'fraudulent' | 'requested_by_customer'> = {
      duplicate_order: 'duplicate',
      damaged_defective: 'requested_by_customer',
      wrong_item: 'requested_by_customer',
      not_as_described: 'requested_by_customer',
      changed_mind: 'requested_by_customer',
      shipping_delay: 'requested_by_customer',
      quality_issues: 'requested_by_customer',
      other: 'requested_by_customer'
    };
    
    return mapping[reason] || 'requested_by_customer';
  }

  /**
   * Restore inventory for refunded items
   */
  private static async restoreInventory(refund: RefundRequest): Promise<void> {
    try {
      // Check if inventory should be restored
      if (refund.inventoryRestored) {
        logger.info(`Inventory already restored for refund ${refund.id}`);
        return;
      }

      // Don't restore inventory for damaged/defective items
      const noRestoreReasons = ['damaged_defective', 'quality_issues'];
      if (noRestoreReasons.includes(refund.reason)) {
        logger.info(`Not restoring inventory for refund ${refund.id} - reason: ${refund.reason}`);
        return;
      }

      // Get refund items or order items
      const items = refund.getRefundItems();
      
      if (!items || items.length === 0) {
        logger.warn(`No items to restore for refund ${refund.id}`);
        return;
      }

      // Restore stock for each item
      for (const item of items) {
        if (!item.productId || !item.quantity) {
          continue;
        }

        // Check if it's a custom embroidery item (skip inventory restoration)
        if (item.productId === 'custom-embroidery') {
          logger.info(`Skipping inventory restoration for custom embroidery item`);
          continue;
        }

        // Check if it's a custom item (skip inventory restoration)
        if (isNaN(parseInt(item.productId))) {
          logger.info(`Skipping inventory restoration for custom item: ${item.productId}`);
          continue;
        }

        // Check if item has embroidery customization (permanent made-to-order, cannot be restocked)
        if (item.customization) {
          const hasEmbroidery = item.customization.designs && Array.isArray(item.customization.designs) && item.customization.designs.length > 0;
          const hasEmbroideryData = item.customization.embroideryData;
          
          if (hasEmbroidery || hasEmbroideryData) {
            logger.info(`Skipping inventory restoration for embroidered item: ${item.productId} - made-to-order/permanent customization`);
            continue;
          }
        }

        // Restore product stock
        const product = await Product.findByPk(parseInt(item.productId));
        if (product) {
          const newStock = (product.stock || 0) + item.quantity;
          await product.update({ stock: newStock });
          logger.info(`Restored ${item.quantity} units to product ${product.id} (${product.title})`);
        }

        // Restore variant stock if applicable
        if (item.variantId) {
          const variant = await Variant.findByPk(item.variantId);
          if (variant) {
            const newStock = (variant.stock || 0) + item.quantity;
            await variant.update({ stock: newStock });
            logger.info(`Restored ${item.quantity} units to variant ${variant.id}`);
          }
        }
      }

      // Mark inventory as restored
      await refund.update({
        inventoryRestored: true,
        inventoryRestoredAt: new Date()
      });

      logger.info(`Inventory restored successfully for refund ${refund.id}`);
    } catch (error: any) {
      logger.error('Error restoring inventory:', error);
      // Don't throw - inventory restoration failure shouldn't fail the refund
    }
  }

  /**
   * Update order refund status after refund completion
   */
  private static async updateOrderRefundStatus(refund: RefundRequest): Promise<void> {
    try {
      const refundType = refund.refundType;
      const refundAmount = parseFloat(refund.refundAmount.toString());

      await sequelize.query(
        `UPDATE order_reviews 
         SET refund_status = ?, 
             refunded_amount = ?, 
             payment_status = ? 
         WHERE id = ?`,
        {
          replacements: [
            refundType === 'full' ? 'full' : 'partial',
            refundAmount,
            refundType === 'full' ? 'refunded' : 'partially_refunded',
            refund.orderId
          ]
        }
      );

      logger.info(`Order ${refund.orderId} refund status updated to ${refundType}`);
    } catch (error: any) {
      logger.error('Error updating order refund status:', error);
    }
  }

  /**
   * Get refund statistics for admin dashboard
   */
  static async getRefundStats(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      const where: any = {};

      if (filters?.startDate) {
        where.requestedAt = { ...where.requestedAt, $gte: filters.startDate };
      }

      if (filters?.endDate) {
        where.requestedAt = { ...where.requestedAt, $lte: filters.endDate };
      }

      const [total, pending, approved, rejected, completed, failed] = await Promise.all([
        RefundRequest.count({ where }),
        RefundRequest.count({ where: { ...where, status: 'pending' } }),
        RefundRequest.count({ where: { ...where, status: ['approved', 'processing'] } }),
        RefundRequest.count({ where: { ...where, status: 'rejected' } }),
        RefundRequest.count({ where: { ...where, status: 'completed' } }),
        RefundRequest.count({ where: { ...where, status: 'failed' } })
      ]);

      // Calculate total refunded amount
      const completedRefunds = await RefundRequest.findAll({
        where: { ...where, status: 'completed' },
        attributes: [[sequelize.fn('SUM', sequelize.col('refund_amount')), 'total']]
      });

      const totalRefundedAmount = completedRefunds[0]?.get('total') || 0;

      return {
        total,
        pending,
        approved,
        rejected,
        completed,
        failed,
        totalRefundedAmount: parseFloat(totalRefundedAmount.toString())
      };
    } catch (error: any) {
      logger.error('Error getting refund stats:', error);
      throw error;
    }
  }
}

export default RefundService;

