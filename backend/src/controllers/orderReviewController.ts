import { Request, Response, NextFunction } from 'express';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { getWebSocketService } from '../services/websocketService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Create order_reviews table (temporary endpoint)
 * @route POST /api/v1/orders/create-table
 * @access Public (temporarily for setup)
 */
export const createOrderReviewsTable = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    console.log('🔄 Creating order_reviews table...');

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
    console.log('✅ order_reviews table created');

    // Add order_review_id column to carts table
    await sequelize.query(`
      ALTER TABLE carts 
      ADD COLUMN order_review_id INT NULL 
      AFTER review_status,
      ADD INDEX idx_order_review_id (order_review_id),
      ADD FOREIGN KEY (order_review_id) REFERENCES order_reviews(id) ON DELETE SET NULL
    `);
    console.log('✅ order_review_id column added to carts table');

    // Add picture reply and confirmation fields
    await sequelize.query(`
      ALTER TABLE order_reviews 
      ADD COLUMN admin_picture_replies JSON NULL AFTER admin_notes,
      ADD COLUMN customer_confirmations JSON NULL AFTER admin_picture_replies,
      ADD COLUMN picture_reply_uploaded_at DATETIME NULL AFTER customer_confirmations,
      ADD COLUMN customer_confirmed_at DATETIME NULL AFTER picture_reply_uploaded_at
    `);
    console.log('✅ Picture reply and confirmation fields added to order_reviews table');

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
 * Submit order for admin review
 * @route POST /api/v1/orders/submit-for-review
 * @access Private (Customer only)
 */
export const submitForReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { items, subtotal, shipping, tax, total, submittedAt, shippingAddress, shippingMethod, customerNotes } = req.body;

    console.log('🔍 Submit for review request:', {
      userId,
      itemsCount: items?.length,
      items: items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        hasCustomization: !!item.customization,
        customizationKeys: item.customization ? Object.keys(item.customization) : [],
        hasDesigns: !!item.customization?.designs?.length,
        designsCount: item.customization?.designs?.length || 0,
        hasMockup: !!item.customization?.mockup,
        mockupLength: item.customization?.mockup?.length || 0,
        firstDesignPreview: item.customization?.designs?.[0]?.preview?.substring(0, 50) + '...' || 'none',
        firstDesignFile: item.customization?.designs?.[0]?.file?.substring(0, 50) + '...' || 'none',
        // 🎯 NEW: Check pricing breakdown
        pricingBreakdown: item.pricingBreakdown,
        productPrice: item.product?.price,
        productName: item.productName,
        productSnapshot: item.productSnapshot,
        quantity: item.quantity
      })),
      subtotal,
      shipping,
      tax,
      total
    });

    // Debug detailed item data being saved
    console.log('🔍 DETAILED ITEMS DATA BEING SAVED:');
    items?.forEach((item: any, index: number) => {
      console.log(`🔍 Item ${index + 1} full data:`, {
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
        productName: item.productName,
        productSnapshot: item.productSnapshot,
        customization: item.customization,
        pricingBreakdown: item.pricingBreakdown,
        reviewStatus: item.reviewStatus
      });
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

    console.log('🔍 Shipping information:', {
      shippingAddress,
      shippingMethod,
      customerNotes: customerNotes || 'none'
    });

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
    
    console.log('🔍 SQL replacements:', replacements);
    console.log('🔍 Replacement count:', replacements.length);
    
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
    
    console.log('🔍 Order review created with ID:', orderReviewId);
    console.log('🔍 Full result:', result);
    console.log('🔍 Result type:', typeof result, 'Is array:', Array.isArray(result));
    
    if (!orderReviewId) {
      // Fallback: query the last inserted ID
      console.log('🔍 No insertId found, querying last inserted ID...');
      const [lastIdResult] = await sequelize.query('SELECT LAST_INSERT_ID() as lastId');
      orderReviewId = Array.isArray(lastIdResult) ? (lastIdResult[0] as any)?.lastId : (lastIdResult as any)?.lastId;
      console.log('🔍 Last inserted ID:', orderReviewId);
    }
    
    if (!orderReviewId) {
      throw new Error('Failed to create order review - no insertId returned');
    }

    // Update cart items to mark them as submitted for review
    const cartItemIds = items.map((item: any) => item.id).filter(Boolean);
    console.log('🔍 Cart item IDs to update:', cartItemIds);
    
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
        
        console.log('🔍 Executing query:', query);
        console.log('🔍 Replacements:', [orderReviewId, ...cartItemIds]);
        
        await sequelize.query(query, {
          replacements: [orderReviewId, ...cartItemIds]
        });
        
        console.log('✅ Cart items updated successfully');
      } catch (updateError) {
        console.error('❌ Error updating cart items:', updateError);
        // Don't fail the entire operation if cart update fails
      }
    } else {
      console.log('⚠️ No cart item IDs found to update');
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
 * Get user's submitted orders for review
 * @route GET /api/v1/orders/review-orders
 * @access Private (Customer only)
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

    // Debug: Log order data structure
    console.log('🔍 Retrieved orders for user:', {
      userId,
      ordersCount: (orders as any[]).length,
      firstOrderData: (orders as any[])[0] ? {
        id: (orders as any[])[0].id,
        orderDataKeys: (orders as any[])[0].order_data ? Object.keys((orders as any[])[0].order_data) : [],
        orderDataLength: (orders as any[])[0].order_data ? JSON.stringify((orders as any[])[0].order_data).length : 0,
        firstItemCustomization: (orders as any[])[0].order_data?.[0]?.customization ? {
          hasDesigns: !!((orders as any[])[0].order_data[0].customization.designs?.length),
          designsCount: ((orders as any[])[0].order_data[0].customization.designs?.length) || 0,
          hasMockup: !!((orders as any[])[0].order_data[0].customization.mockup),
          mockupLength: ((orders as any[])[0].order_data[0].customization.mockup?.length) || 0,
          firstDesignPreview: ((orders as any[])[0].order_data[0].customization.designs?.[0]?.preview?.substring(0, 50)) + '...' || 'none',
          firstDesignFile: ((orders as any[])[0].order_data[0].customization.designs?.[0]?.file?.substring(0, 50)) + '...' || 'none'
        } : null
      } : null
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
 * Get all orders for admin review
 * @route GET /api/v1/orders/admin/review-orders
 * @access Private (Admin only)
 */
export const getAllReviewOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    console.log('🔍 Getting all review orders...');
    console.log('👤 User making request:', req.user);
    
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

    console.log('📊 Found orders:', orders);

    // 🎯 NEW: Debug the order_data being returned
    console.log('🔍 ADMIN RETRIEVAL - ORDER DATA BEING RETURNED:');
    (orders as any[]).forEach((order, index) => {
      console.log(`🔍 Order ${index + 1} (ID: ${order.id}) data:`);
      console.log(`🔍 - Subtotal: ${order.subtotal}`);
      console.log(`🔍 - Shipping: ${order.shipping}`);
      console.log(`🔍 - Tax: ${order.tax}`);
      console.log(`🔍 - Total: ${order.total}`);
      console.log(`🔍 - Order data type: ${typeof order.order_data}`);
      console.log(`🔍 - Order data value: ${order.order_data}`);
      
      try {
        const parsedData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
        if (Array.isArray(parsedData)) {
          parsedData.forEach((item: any, itemIndex: number) => {
            console.log(`🔍   Item ${itemIndex + 1}:`, {
              productId: item.productId,
              quantity: item.quantity,
              pricingBreakdown: item.pricingBreakdown,
              productPrice: item.product?.price,
              customization: item.customization ? 'EXISTS' : 'MISSING'
            });
          });
        }
      } catch (e) {
        console.log(`🔍   Parse error: ${e}`);
      }
    });

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
 * Update order review status (Admin only)
 * @route PATCH /api/v1/orders/admin/review-orders/:id
 * @access Private (Admin only)
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
 * Upload picture reply for order review (Admin only)
 * @route POST /api/v1/orders/admin/review-orders/:id/picture-reply
 * @access Private (Admin only)
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
 * Customer confirm picture replies
 * @route POST /api/v1/orders/review-orders/:id/confirm-pictures
 * @access Private (Customer only)
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
 * Get order statistics for dashboard
 * @route GET /api/v1/orders/admin/stats
 * @access Private (Admin only)
 */
export const getOrderStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Get total orders count
    const [totalOrdersResult] = await sequelize.query(`
      SELECT COUNT(*) as total_orders
      FROM order_reviews
    `);
    const totalOrders = (totalOrdersResult[0] as any).total_orders || 0;

    // Get total sales from delivered orders
    const [totalSalesResult] = await sequelize.query(`
      SELECT COALESCE(SUM(total), 0) as total_sales
      FROM order_reviews
      WHERE status = 'delivered'
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

    // Get recent paid orders (last 10)
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
      ORDER BY or_table.updated_at DESC
      LIMIT 10
    `);

    // Get revenue chart data (last 7 days)
    const [revenueChartResult] = await sequelize.query(`
      SELECT 
        DATE(updated_at) as date,
        COALESCE(SUM(total), 0) as revenue
      FROM order_reviews
      WHERE status = 'delivered'
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(updated_at)
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
