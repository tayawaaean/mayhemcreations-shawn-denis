import { Request, Response, NextFunction } from 'express';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { getWebSocketService } from '../services/websocketService';
import { EmailNotificationService } from '../services/emailNotificationService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Create order_reviews table
 * @route POST /api/v1/orders/create-table
 * @access Public (for setup - should be removed or protected after initial deployment)
 */
export const createOrderReviewsTable = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    logger.info('Creating order_reviews table');

    // Create order_reviews table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_data JSON NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        shipping DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'needs-changes', 'pending-payment', 'approved-processing', 'picture-reply-pending', 'picture-reply-rejected', 'picture-reply-approved', 'ready-for-production', 'in-production', 'ready-for-checkout') NOT NULL DEFAULT 'pending',
        submitted_at DATETIME NOT NULL,
        reviewed_at DATETIME NULL,
        admin_notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add order_review_id column to carts table
    await sequelize.query(`
      ALTER TABLE carts 
      ADD COLUMN order_review_id INT NULL 
      AFTER review_status,
      ADD INDEX idx_order_review_id (order_review_id),
      ADD FOREIGN KEY (order_review_id) REFERENCES order_reviews(id) ON DELETE SET NULL
    `);

    // Add picture reply and confirmation fields
    await sequelize.query(`
      ALTER TABLE order_reviews 
      ADD COLUMN admin_picture_replies JSON NULL AFTER admin_notes,
      ADD COLUMN customer_confirmations JSON NULL AFTER admin_picture_replies,
      ADD COLUMN picture_reply_uploaded_at DATETIME NULL AFTER customer_confirmations,
      ADD COLUMN customer_confirmed_at DATETIME NULL AFTER picture_reply_uploaded_at
    `);

    res.status(200).json({
      success: true,
      message: 'Order reviews table created successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info('Order reviews table created');
  } catch (error: any) {
    logger.error('Error creating order reviews table:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order reviews table',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/submit-for-review:
 *   post:
 *     tags: [Orders]
 *     summary: Submit order for admin review
 *     description: Submits a custom order with items for admin review before processing. Customer can include notes and shipping preferences.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - subtotal
 *               - shipping
 *               - tax
 *               - total
 *             properties:
 *               items:
 *                 type: array
 *                 description: Order items (cart items or custom items)
 *                 items:
 *                   type: object
 *               subtotal:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *               shipping:
 *                 type: number
 *                 format: float
 *                 example: 10.00
 *               tax:
 *                 type: number
 *                 format: float
 *                 example: 8.00
 *               total:
 *                 type: number
 *                 format: float
 *                 example: 117.99
 *               shippingAddress:
 *                 type: object
 *                 description: Shipping address
 *               shippingMethod:
 *                 type: string
 *                 example: standard
 *               customerNotes:
 *                 type: string
 *                 description: Additional notes from customer
 *     responses:
 *       201:
 *         description: Order submitted for review successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         status:
 *                           type: string
 *                           example: pending
 *       400:
 *         description: Invalid order data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const submitForReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { items, subtotal, shipping, tax, total, submittedAt, shippingAddress, shippingMethod, customerNotes } = req.body;

    logger.info('Submit for review request', {
      userId,
      itemsCount: items?.length,
      subtotal,
      shipping,
      tax,
      total
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided for review',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate shipping information
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Complete shipping address is required (street, city, state, zipCode)',
        code: 'MISSING_SHIPPING_ADDRESS',
        timestamp: new Date().toISOString(),
      });
    }

    if (!shippingMethod || shipping === undefined || shipping < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid shipping method must be selected',
        code: 'MISSING_SHIPPING_METHOD',
        timestamp: new Date().toISOString(),
      });
    }

    // Create order review record using raw query with proper insertId handling
    const replacements = [
      userId,
      JSON.stringify(items),
      subtotal,
      shipping || 0, // Handle undefined shipping as 0
      tax || 0, // Handle undefined tax as 0 (column is NOT NULL)
      total,
      submittedAt ? new Date(submittedAt) : new Date(),
      JSON.stringify(shippingAddress), // NEW: shipping address
      JSON.stringify(shippingMethod), // NEW: shipping method
      customerNotes || null, // NEW: customer notes
      shippingMethod.carrier || null // NEW: shipping carrier for indexing
    ];
    
    const [result] = await sequelize.query(`
      INSERT INTO order_reviews (
        user_id, 
        order_data, 
        subtotal, 
        shipping, 
        tax, 
        total, 
        status, 
        submitted_at,
        shipping_address,
        shipping_method,
        customer_notes,
        shipping_carrier,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: replacements
    });

    // Handle different result formats from Sequelize raw queries
    let orderReviewId: number | undefined;
    
    if (Array.isArray(result)) {
      // For some MySQL configurations, result is an array
      orderReviewId = (result[0] as any)?.insertId;
    } else if (result && typeof result === 'object') {
      // For other configurations, result is an object
      orderReviewId = (result as any).insertId;
    }
    
    if (!orderReviewId) {
      // Fallback: query the last inserted ID
      // No insertId found, querying last inserted ID - debug logging disabled
      const [lastIdResult] = await sequelize.query('SELECT LAST_INSERT_ID() as lastId');
      orderReviewId = Array.isArray(lastIdResult) ? (lastIdResult[0] as any)?.lastId : (lastIdResult as any)?.lastId;
    }
    
    if (!orderReviewId) {
      throw new Error('Failed to create order review - no insertId returned');
    }

    // Update cart items to mark them as submitted for review
    const cartItemIds = items.map((item: any) => item.id).filter(Boolean);
    
    if (cartItemIds.length > 0) {
      try {
        const placeholders = cartItemIds.map(() => '?').join(',');
        const query = `
          UPDATE carts 
          SET review_status = 'submitted', 
              order_review_id = ?,
              updated_at = NOW()
          WHERE id IN (${placeholders})
        `;
        
        await sequelize.query(query, {
          replacements: [orderReviewId, ...cartItemIds]
        });
        
        // Cart items updated successfully - debug logging disabled
      } catch (updateError) {
        logger.error('Error updating cart items', { orderReviewId, error: updateError });
        // Don't fail the entire operation if cart update fails
      }
    } else {
      logger.warn('No cart item IDs found to update', { orderReviewId });
    }

    res.status(201).json({
      success: true,
      data: {
        orderReviewId,
        status: 'pending',
        submittedAt: submittedAt || new Date().toISOString(),
        itemCount: items.length,
        total,
        shipping: {
          cost: shipping,
          method: shippingMethod,
          address: shippingAddress,
          estimatedDelivery: shippingMethod.estimatedDeliveryDate || 
            (shippingMethod.estimatedDeliveryDays 
              ? new Date(Date.now() + shippingMethod.estimatedDeliveryDays * 24 * 60 * 60 * 1000).toISOString()
              : null)
        }
      },
      message: 'Order submitted for review successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Order submitted for review by user ${userId}`, {
      userId,
      orderReviewId,
      itemCount: items.length,
      total,
      shipping,
      shippingCarrier: shippingMethod.carrier,
      shippingService: shippingMethod.serviceName
    });

    // Emit notification to admin room about new pending review order
    try {
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        webSocketService.emitToAdminRoom('new_order_notification', {
          type: 'new_order',
          orderReviewId,
          userId,
          itemCount: items.length,
          total,
          shipping: {
            carrier: shippingMethod.carrier,
            cost: shipping,
            service: shippingMethod.serviceName
          },
          status: 'pending',
          message: `New order submitted for review (${items.length} items, $${total} with ${shippingMethod.carrier} shipping)`,
          timestamp: new Date().toISOString()
        });
        logger.info(`📢 Emitted new order notification for order ${orderReviewId}`);
      }
    } catch (notificationError) {
      logger.error('Error emitting new order notification:', notificationError);
      // Don't fail the request if notification fails
    }

  } catch (error: any) {
    logger.error('Error submitting order for review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit order for review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/review-orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get user's submitted orders for review
 *     description: Retrieves all orders submitted by the authenticated customer for admin review.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, needs-changes, pending-payment, approved-processing, picture-reply-pending, picture-reply-rejected, picture-reply-approved, ready-for-production, in-production, ready-for-checkout]
 *         description: Filter by order status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getUserReviewOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    const [orders] = await sequelize.query(`
      SELECT 
        id,
        order_data,
        subtotal,
        shipping,
        tax,
        total,
        status,
        submitted_at,
        reviewed_at,
        admin_notes,
        admin_picture_replies,
        customer_confirmations,
        picture_reply_uploaded_at,
        customer_confirmed_at,
        shipping_address,
        billing_address,
        shipping_method,
        customer_notes,
        tracking_number,
        shipping_carrier,
        shipped_at,
        delivered_at,
        estimated_delivery_date,
        refund_status,
        refunded_amount,
        refund_requested_at,
        created_at,
        updated_at
      FROM order_reviews 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, {
      replacements: [userId]
    });

    res.status(200).json({
      success: true,
      data: orders,
      message: 'Review orders retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error getting user review orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get review orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/admin/review-orders:
 *   get:
 *     tags: [Orders, Admin]
 *     summary: Get all orders for admin review
 *     description: Retrieves all orders submitted for review. Admin-only endpoint for managing order reviews.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, needs-changes, pending-payment, approved-processing, picture-reply-pending, picture-reply-rejected, picture-reply-approved, ready-for-production, in-production, ready-for-checkout]
 *         description: Filter by order status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getAllReviewOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    logger.info('Getting all review orders', { adminId: req.user?.id });
    
    const [orders] = await sequelize.query(`
      SELECT 
        order_reviews.id,
        order_reviews.user_id,
        u.email as user_email,
        u.first_name,
        u.last_name,
        order_reviews.order_data,
        order_reviews.subtotal,
        order_reviews.shipping,
        order_reviews.tax,
        order_reviews.total,
        order_reviews.status,
        order_reviews.submitted_at,
        order_reviews.reviewed_at,
        order_reviews.admin_notes,
        order_reviews.admin_picture_replies,
        order_reviews.customer_confirmations,
        order_reviews.picture_reply_uploaded_at,
        order_reviews.customer_confirmed_at,
        order_reviews.order_number,
        order_reviews.shipping_address,
        order_reviews.billing_address,
        order_reviews.shipping_method,
        order_reviews.payment_method,
        order_reviews.payment_status,
        order_reviews.payment_provider,
        order_reviews.payment_intent_id,
        order_reviews.transaction_id,
        order_reviews.card_last4,
        order_reviews.card_brand,
        order_reviews.tracking_number,
        order_reviews.shipping_carrier,
        order_reviews.shipped_at,
        order_reviews.delivered_at,
        order_reviews.estimated_delivery_date,
        order_reviews.customer_notes,
        order_reviews.internal_notes,
        order_reviews.created_at,
        order_reviews.updated_at
      FROM order_reviews
      LEFT JOIN users u ON order_reviews.user_id = u.id
      ORDER BY order_reviews.created_at DESC
    `);

    // Retrieved all review orders - debug logging disabled for verbosity

    res.status(200).json({
      success: true,
      data: orders,
      message: 'All review orders retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error getting all review orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get review orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/admin/review-orders/{id}:
 *   patch:
 *     tags: [Orders, Admin]
 *     summary: Update order review status
 *     description: Updates the status of an order review. Admin-only endpoint for approving, rejecting, or requesting changes.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order review ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, needs-changes, pending-payment, approved-processing, picture-reply-pending, picture-reply-rejected, picture-reply-approved, ready-for-production, in-production, ready-for-checkout]
 *                 example: approved
 *                 description: New status for the order review
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes or comments
 *     responses:
 *       200:
 *         description: Order review status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Invalid status or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const updateReviewStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber, shippingCarrier } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'needs-changes', 'pending-payment', 'approved-processing', 'picture-reply-pending', 'picture-reply-rejected', 'picture-reply-approved', 'ready-for-production', 'in-production', 'ready-for-checkout', 'shipped', 'delivered', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch current order status before updating (needed for stock deduction logic)
    const [orderResult] = await sequelize.query(`
      SELECT id, status 
      FROM order_reviews 
      WHERE id = ?
    `, {
      replacements: [id]
    });

    if (!Array.isArray(orderResult) || orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order review not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const currentOrder = orderResult[0] as any;
    const previousStatus = currentOrder.status;

    // If admin approves, automatically set status to pending-payment
    const finalStatus = status === 'approved' ? 'pending-payment' : status;
    
    // Build update query dynamically based on status
    let updateQuery = `UPDATE order_reviews SET status = ?, admin_notes = ?, reviewed_at = NOW(), updated_at = NOW()`;
    let replacements: any[] = [finalStatus, adminNotes || null];

    // If status is 'shipped', set shipped_at timestamp
    // Tracking info should already be set from label creation
    if (status === 'shipped') {
      updateQuery += `, shipped_at = NOW()`;
      // Note: tracking_number and carrier_code are already set when label is created
      // If manual tracking info is provided, update it
      if (trackingNumber || shippingCarrier) {
        updateQuery += `, tracking_number = COALESCE(?, tracking_number), shipping_carrier = COALESCE(?, shipping_carrier)`;
        replacements.push(trackingNumber || null, shippingCarrier || null);
      }
    }

    // If status is 'delivered', update delivered_at
    if (status === 'delivered') {
      updateQuery += `, delivered_at = NOW()`;
    }

    updateQuery += ` WHERE id = ?`;
    replacements.push(id);

    const [result] = await sequelize.query(updateQuery, {
      replacements
    });

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Failed to update order review',
        code: 'UPDATE_FAILED',
        timestamp: new Date().toISOString(),
      });
    }

    // Deduct stock when order is approved/processing (before production starts)
    // This reserves the inventory as soon as the order is confirmed
    // Only deduct once - check if previous status was NOT already approved or processing
    const shouldDeductStock = (finalStatus === 'approved' || finalStatus === 'processing' || finalStatus === 'pending-payment' || finalStatus === 'approved-processing') && 
                              previousStatus !== 'approved' && 
                              previousStatus !== 'processing' &&
                              previousStatus !== 'pending-payment' &&
                              previousStatus !== 'approved-processing';
    
    if (shouldDeductStock) {
      try {
        const { deductStockForOrder } = await import('../services/stockService');
        const stockDeducted = await deductStockForOrder(parseInt(id));
        if (stockDeducted) {
          logger.info(`✅ Stock deducted successfully for order ${id} (status: ${previousStatus} → ${finalStatus})`);
        } else {
          logger.warn(`⚠️ Failed to deduct stock for order ${id}`);
        }
      } catch (stockError) {
        logger.error(`❌ Error deducting stock for order ${id}:`, stockError);
        // Don't fail the status update if stock deduction fails
        // Admin can manually adjust inventory if needed
      }
    } else if ((finalStatus === 'approved' || finalStatus === 'processing' || finalStatus === 'pending-payment' || finalStatus === 'approved-processing') && 
               (previousStatus === 'approved' || previousStatus === 'processing' || previousStatus === 'pending-payment' || previousStatus === 'approved-processing')) {
      logger.info(`⏭️ Skipping stock deduction for order ${id} - already deducted (status: ${previousStatus} → ${finalStatus})`);
    }
    
    // Note: Custom embroidery items don't have stock limits (made-to-order)
    // Only physical products like caps, bags, etc. will have stock deducted

    // If approved, update cart items to approved status
    if (status === 'approved') {
      await sequelize.query(`
        UPDATE carts 
        SET review_status = 'approved', 
            updated_at = NOW()
        WHERE order_review_id = ?
      `, {
        replacements: [id]
      });
    }

    // Get user_id for WebSocket notification
    const [userResult] = await sequelize.query(`
      SELECT user_id FROM order_reviews WHERE id = ?
    `, {
      replacements: [id]
    });

    const userId = (userResult as any)[0]?.user_id;

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        status: finalStatus,
        originalStatus: status,
        adminNotes,
        reviewedAt: new Date().toISOString()
      },
      message: status === 'approved' 
        ? 'Order approved! Status automatically updated to pending payment.' 
        : 'Order review status updated successfully',
      timestamp: new Date().toISOString(),
    });

    // Emit WebSocket event for real-time updates
    const webSocketService = getWebSocketService();
    if (webSocketService && userId) {
      webSocketService.emitOrderStatusChange(parseInt(id), {
        userId,
        status: finalStatus,
        originalStatus: status,
        adminNotes,
        reviewedAt: new Date().toISOString(),
        trackingNumber: status === 'shipped' ? trackingNumber : undefined,
        shippingCarrier: status === 'shipped' ? shippingCarrier : undefined,
        shippedAt: status === 'shipped' ? new Date().toISOString() : undefined,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : undefined
      });

      // Emit notification to admin room for delivered orders
      if (status === 'delivered') {
        try {
          webSocketService.emitToAdminRoom('order_delivered_notification', {
            type: 'order_delivered',
            orderReviewId: parseInt(id),
            userId,
            status: finalStatus,
            message: `Order #${id} has been delivered`,
            timestamp: new Date().toISOString()
          });
          logger.info(`📢 Emitted delivered order notification for order ${id}`);
        } catch (notificationError) {
          logger.error('Error emitting delivered order notification:', notificationError);
        }
      }

      // Send shipping confirmation email when order is shipped
      if (status === 'shipped') {
        try {
          // Get order details for email
          const [orderResult] = await sequelize.query(`
            SELECT o.*, u.email, u.first_name, u.last_name
            FROM order_reviews o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
          `, {
            replacements: [id]
          });

          if (Array.isArray(orderResult) && orderResult.length > 0) {
            const order = orderResult[0] as any;
            const customerName = `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Customer';
            const customerEmail = order.email;

            // Get order items
            const orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
            const orderItems = orderData?.items || [];

            // Parse shipping address
            const shippingAddress = typeof order.shipping_address === 'string' 
              ? JSON.parse(order.shipping_address) 
              : order.shipping_address || {};

            // Send shipping confirmation email
            await EmailNotificationService.sendShippingConfirmation({
              customerName,
              customerEmail,
              orderNumber: order.order_number || `ORD-${order.id}`,
              orderId: order.id,
              shippingInfo: {
                carrier: shippingCarrier || order.shipping_carrier || 'Standard Shipping',
                service: 'Standard',
                trackingNumber: trackingNumber || order.tracking_number,
                trackingUrl: (trackingNumber || order.tracking_number) 
                  ? `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber || order.tracking_number}` 
                  : undefined
              },
              orderItems: orderItems.map((item: any) => ({
                id: item.id || item.cartItemId,
                productId: item.productId,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                imageUrl: item.imageUrl
              })),
              shippingAddress: {
                firstName: shippingAddress.firstName || '',
                lastName: shippingAddress.lastName || '',
                addressLine1: shippingAddress.street || shippingAddress.addressLine1 || '',
                city: shippingAddress.city || '',
                state: shippingAddress.state || '',
                postalCode: shippingAddress.zipCode || shippingAddress.postalCode || '',
                country: shippingAddress.country || 'US',
                phone: shippingAddress.phone || ''
              }
            });

            logger.info('Shipping confirmation email sent', {
              orderId: id,
              customerEmail
            });
          }
        } catch (emailError) {
          logger.error('Error sending shipping confirmation email:', emailError);
          // Don't fail the request if email fails
        }
      }
    }

    logger.info(`Order review ${id} status updated to ${status}`, {
      orderReviewId: id,
      status,
      adminId: req.user?.id
    });

  } catch (error: any) {
    logger.error('Error updating review status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/admin/review-orders/{id}/picture-reply:
 *   post:
 *     tags: [Orders, Admin]
 *     summary: Upload picture reply for order review
 *     description: Allows admin to upload picture replies showing the embroidered product for customer review. Admin-only endpoint.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order review ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pictures
 *             properties:
 *               pictures:
 *                 type: array
 *                 description: Array of picture URLs or base64 encoded images
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *     responses:
 *       200:
 *         description: Picture reply uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Invalid picture data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const uploadPictureReply = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { pictureReplies } = req.body; // Array of { itemId, designId?, image, notes }

    if (!pictureReplies || !Array.isArray(pictureReplies)) {
      return res.status(400).json({
        success: false,
        message: 'Picture replies data is required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Enhanced picture reply structure for multi-design support
    const pictureRepliesWithTimestamp = pictureReplies.map((reply: any) => ({
      ...reply,
      uploadedAt: new Date().toISOString(),
      // Support for design-specific replies (same productId, different designs)
      designId: reply.designId || null, // Optional design ID for multi-design items
      designName: reply.designName || null, // Optional design name for reference
      embroideryStyle: reply.embroideryStyle || null // Optional embroidery style info
    }));

    // Update the order review with picture replies
    const [result] = await sequelize.query(`
      UPDATE order_reviews 
      SET admin_picture_replies = ?,
          picture_reply_uploaded_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, {
      replacements: [JSON.stringify(pictureRepliesWithTimestamp), id]
    });

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order review not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Get user_id for WebSocket notification
    const [userResult] = await sequelize.query(`
      SELECT user_id FROM order_reviews WHERE id = ?
    `, {
      replacements: [id]
    });

    const userId = (userResult as any)[0]?.user_id;

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        pictureReplies: pictureRepliesWithTimestamp,
        uploadedAt: new Date().toISOString()
      },
      message: 'Picture replies uploaded successfully',
      timestamp: new Date().toISOString(),
    });

    // Emit WebSocket event for real-time updates
    const webSocketService = getWebSocketService();
    if (webSocketService && userId) {
      webSocketService.emitPictureReplyUploaded(parseInt(id), {
        userId,
        pictureReplies: pictureRepliesWithTimestamp,
        uploadedAt: new Date().toISOString()
      });
    }

    logger.info(`Picture replies uploaded for order review ${id}`, {
      orderReviewId: id,
      adminId: req.user?.id,
      replyCount: pictureReplies.length
    });

  } catch (error: any) {
    logger.error('Error uploading picture replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload picture replies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/review-orders/{id}/confirm-pictures:
 *   post:
 *     tags: [Orders]
 *     summary: Customer confirm picture replies
 *     description: Allows customer to confirm or request changes to admin's picture replies showing the embroidered product.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order review ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmations
 *             properties:
 *               confirmations:
 *                 type: array
 *                 description: Array of confirmation objects for each picture
 *                 items:
 *                   type: object
 *                   properties:
 *                     pictureIndex:
 *                       type: integer
 *                       description: Index of the picture in admin's reply
 *                     confirmed:
 *                       type: boolean
 *                       description: Whether customer confirmed this picture
 *                     notes:
 *                       type: string
 *                       description: Optional notes or change requests
 *     responses:
 *       200:
 *         description: Picture confirmations saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Invalid confirmation data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const confirmPictureReplies = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { confirmations } = req.body; // Array of { itemId, designId?, confirmed, notes }

    if (!confirmations || !Array.isArray(confirmations)) {
      return res.status(400).json({
        success: false,
        message: 'Confirmations data is required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Enhanced confirmation structure for multi-design support
    const enhancedConfirmations = confirmations.map((conf: any) => ({
      ...conf,
      confirmedAt: new Date().toISOString(),
      // Support for design-specific confirmations (same productId, different designs)
      designId: conf.designId || null, // Optional design ID for multi-design items
      designName: conf.designName || null, // Optional design name for reference
      embroideryStyle: conf.embroideryStyle || null // Optional embroidery style info
    }));

    // Update the order review with customer confirmations
    const [result] = await sequelize.query(`
      UPDATE order_reviews 
      SET customer_confirmations = ?,
          customer_confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, {
      replacements: [JSON.stringify(enhancedConfirmations), id, req.user?.id]
    });

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order review not found or not authorized',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Automatically move order to pending-payment upon confirmation
    // Check if all confirmations are approved
    const allApproved = enhancedConfirmations.every(conf => conf.confirmed === true);
    const anyRejected = enhancedConfirmations.some(conf => conf.confirmed === false);
    
    let newStatus = 'needs-changes'; // Default status
    
    if (allApproved) {
      newStatus = 'pending-payment';
    } else if (anyRejected) {
      newStatus = 'picture-reply-rejected';
    }
    
    await sequelize.query(`
      UPDATE order_reviews 
      SET status = ?,
          reviewed_at = COALESCE(reviewed_at, NOW()),
          updated_at = NOW()
      WHERE id = ?
    `, { replacements: [newStatus, id] });

    // Mark related cart items as approved
    try {
      await sequelize.query(`
        UPDATE carts 
        SET review_status = 'approved',
            updated_at = NOW()
        WHERE order_review_id = ?
      `, { replacements: [id] });
    } catch (e: any) {
      // Fallback if order_review_id column doesn't exist
      if (typeof e?.message === 'string' && e.message.includes("Unknown column 'order_review_id'")) {
        // Retrieve order_data to get cart item IDs
        const [orderDataResult] = await sequelize.query(`
          SELECT order_data FROM order_reviews WHERE id = ?
        `, { replacements: [id] });
        const orderDataRow: any = Array.isArray(orderDataResult) ? orderDataResult[0] : orderDataResult;
        let itemIds: number[] = [];
        try {
          const orderItems = Array.isArray(orderDataRow?.order_data)
            ? orderDataRow.order_data
            : JSON.parse(orderDataRow?.order_data || '[]');
          itemIds = orderItems.map((it: any) => it.id).filter((v: any) => typeof v === 'number');
        } catch {}

        if (itemIds.length > 0) {
          const placeholders = itemIds.map(() => '?').join(',');
          await sequelize.query(`
            UPDATE carts 
            SET review_status = 'approved',
                updated_at = NOW()
            WHERE id IN (${placeholders})
          `, { replacements: itemIds });
        }
      } else {
        throw e;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        confirmations: enhancedConfirmations,
        status: newStatus,
        confirmedAt: new Date().toISOString()
      },
      message: allApproved 
        ? 'Picture confirmations submitted successfully. Status updated to pending payment.'
        : anyRejected 
          ? 'Some pictures were rejected. Admin will upload new designs.'
          : 'Picture confirmations submitted successfully.',
      timestamp: new Date().toISOString(),
    });

    // Emit WebSocket event for real-time updates
    const webSocketService = getWebSocketService();
    if (webSocketService && req.user?.id) {
      webSocketService.emitCustomerConfirmation(parseInt(id), {
        userId: req.user.id,
        confirmations: enhancedConfirmations,
        confirmedAt: new Date().toISOString()
      });
      webSocketService.emitOrderStatusChange(parseInt(id), {
        userId: req.user.id,
        status: newStatus,
        originalStatus: 'picture-reply-approved',
        reviewedAt: new Date().toISOString()
      });
    }

    logger.info(`Picture confirmations submitted for order review ${id}`, {
      orderReviewId: id,
      userId: req.user?.id,
      confirmationCount: confirmations.length
    });

  } catch (error: any) {
    logger.error('Error confirming picture replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm picture replies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/admin/stats:
 *   get:
 *     tags: [Orders, Admin]
 *     summary: Get order statistics for dashboard
 *     description: Retrieves order statistics and analytics for the admin dashboard. Includes counts by status, totals, and trends.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics range
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics range
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                         ordersByStatus:
 *                           type: object
 *                         totalRevenue:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const getOrderStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Get period from query parameter (defaults to '7d')
    const period = req.query.period as string || '7d';
    
    // Calculate date range based on period
    let daysInterval = 7;
    let dateFormat = '%Y-%m-%d'; // Daily format
    let intervalString = 'DAY';
    
    switch (period) {
      case '7d':
        daysInterval = 7;
        dateFormat = '%Y-%m-%d';
        intervalString = 'DAY';
        break;
      case '30d':
        daysInterval = 30;
        dateFormat = '%Y-%m-%d';
        intervalString = 'DAY';
        break;
      case '90d':
        daysInterval = 90;
        dateFormat = '%Y-%m-%d';
        intervalString = 'DAY';
        break;
      case '1y':
        daysInterval = 365;
        dateFormat = '%Y-%m'; // Monthly format for year view
        intervalString = 'MONTH';
        break;
      default:
        daysInterval = 7;
        dateFormat = '%Y-%m-%d';
        intervalString = 'DAY';
    }
    
    // Get total orders count for the selected period
    const [totalOrdersResult] = await sequelize.query(`
      SELECT COUNT(*) as total_orders
      FROM order_reviews
      WHERE updated_at >= DATE_SUB(NOW(), INTERVAL ${daysInterval} ${intervalString})
    `);
    const totalOrders = (totalOrdersResult[0] as any).total_orders || 0;

    // Get total sales from delivered orders for the selected period, excluding refunded orders
    // For partially refunded orders, subtract the refunded amount from total
    const [totalSalesResult] = await sequelize.query(`
      SELECT COALESCE(
        SUM(
          CASE 
            WHEN payment_status = 'refunded' THEN 0
            WHEN payment_status = 'partially_refunded' THEN total - COALESCE(refunded_amount, 0)
            ELSE total
          END
        ), 
        0
      ) as total_sales
      FROM order_reviews
      WHERE status = 'delivered'
        AND payment_status NOT IN ('pending', 'failed', 'cancelled')
        AND updated_at >= DATE_SUB(NOW(), INTERVAL ${daysInterval} ${intervalString})
    `);
    const totalSales = parseFloat((totalSalesResult[0] as any).total_sales) || 0;

    // Get order count by status for additional insights
    const [ordersByStatusResult] = await sequelize.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM order_reviews
      GROUP BY status
    `);

    // Get recent paid orders for the selected period (last 10)
    const [recentOrdersResult] = await sequelize.query(`
      SELECT 
        or_table.id,
        or_table.order_number,
        or_table.total,
        or_table.status,
        or_table.updated_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email
      FROM order_reviews or_table
      JOIN users u ON or_table.user_id = u.id
      WHERE or_table.payment_status = 'completed'
        AND or_table.updated_at >= DATE_SUB(NOW(), INTERVAL ${daysInterval} ${intervalString})
      ORDER BY or_table.updated_at DESC
      LIMIT 10
    `);

    // Get revenue chart data for the selected period, excluding refunded orders
    // Validate period and interval to prevent SQL injection (only allow controlled values)
    const validIntervals = ['DAY', 'MONTH'];
    if (!validIntervals.includes(intervalString)) {
      intervalString = 'DAY';
    }
    
    // Use safe date format (controlled enum value)
    const dateFormatSql = period === '1y' ? '%Y-%m' : '%Y-%m-%d';
    
    const [revenueChartResult] = await sequelize.query(`
      SELECT 
        DATE_FORMAT(updated_at, '${dateFormatSql}') as date,
        COALESCE(
          SUM(
            CASE 
              WHEN payment_status = 'refunded' THEN 0
              WHEN payment_status = 'partially_refunded' THEN total - COALESCE(refunded_amount, 0)
              ELSE total
            END
          ), 
          0
        ) as revenue
      FROM order_reviews
      WHERE status = 'delivered'
        AND payment_status NOT IN ('pending', 'failed', 'cancelled')
        AND updated_at >= DATE_SUB(NOW(), INTERVAL ${daysInterval} ${intervalString})
      GROUP BY DATE_FORMAT(updated_at, '${dateFormatSql}')
      ORDER BY date ASC
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalSales,
        ordersByStatus: ordersByStatusResult,
        recentOrders: recentOrdersResult,
        revenueChart: revenueChartResult
      },
      message: 'Order statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching order statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * @swagger
 * /api/v1/orders/review-orders/{id}/confirm-delivery:
 *   post:
 *     tags: [Orders]
 *     summary: Customer confirm order delivery
 *     description: Allows customer to confirm they have received their order, marking it as delivered.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order review ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Order delivery confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: delivered
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export const confirmOrderDelivery = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if order exists and belongs to user
    const [orderResult] = await sequelize.query(`
      SELECT * FROM order_reviews 
      WHERE id = ? AND user_id = ?
    `, {
      replacements: [id, userId]
    });

    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        timestamp: new Date().toISOString(),
      });
    }

    const order = orderResult[0] as any;

    // Only allow confirming delivery if order is shipped
    if (order.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in shipped status to confirm delivery',
        currentStatus: order.status,
        timestamp: new Date().toISOString(),
      });
    }

    // Update order status to delivered
    const deliveredAt = new Date();
    await sequelize.query(`
      UPDATE order_reviews 
      SET status = 'delivered', 
          delivered_at = ?
      WHERE id = ?
    `, {
      replacements: [deliveredAt, id]
    });

    logger.info(`Order ${id} marked as delivered by customer ${userId}`);

    // Send delivery notification and review request emails
    try {
      // Get user details
      const [userResult] = await sequelize.query(`
        SELECT email, first_name, last_name FROM users WHERE id = ?
      `, {
        replacements: [userId]
      });

      if (Array.isArray(userResult) && userResult.length > 0) {
        const user = userResult[0] as any;
        const customerName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Customer';
        const customerEmail = user.email;

        // Get order items for email
        const orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
        const orderItems = orderData?.items || [];

        // Send delivery notification email
        await EmailNotificationService.sendDeliveryNotification({
          customerName,
          customerEmail,
          orderNumber: order.order_number || `ORD-${order.id}`,
          orderId: order.id,
          deliveryDate: deliveredAt.toISOString(),
          orderItems: orderItems.map((item: any) => ({
            id: item.id || item.cartItemId,
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            imageUrl: item.imageUrl
          }))
        });

        // Send review request email (24 hours after delivery)
        setTimeout(async () => {
          try {
            await EmailNotificationService.sendReviewRequest({
              customerName,
              customerEmail,
              orderNumber: order.order_number || `ORD-${order.id}`,
              orderId: order.id,
              orderItems: orderItems.map((item: any) => ({
                id: item.id || item.cartItemId,
                productId: item.productId,
                productName: item.productName,
                variantName: item.variantName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                imageUrl: item.imageUrl
              }))
            });
            logger.info(`Review request email sent for order ${id}`);
          } catch (reviewEmailError) {
            logger.error('Error sending review request email:', reviewEmailError);
          }
        }, 24 * 60 * 60 * 1000); // 24 hours delay

        logger.info('Delivery notification email sent', {
          orderId: id,
          customerEmail
        });
      }
    } catch (emailError) {
      logger.error('Error sending delivery notification email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        status: 'delivered',
        deliveredAt: deliveredAt.toISOString()
      },
      message: 'Order confirmed as delivered successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error confirming order delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to confirm order delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};
