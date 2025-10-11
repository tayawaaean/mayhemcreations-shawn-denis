/**
 * Order Controller
 * Handles order management operations
 */

import { Request, Response, NextFunction } from 'express';
import Order from '../models/orderModel';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

// Define authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role?: string;
  };
}

/**
 * Get all orders (Admin)
 * @route GET /api/v1/orders
 * @access Private (Admin only)
 */
export const getAllOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Get query parameters for filtering and pagination
    const {
      status,
      paymentStatus,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Map camelCase sortBy to snake_case for database column
    const sortByMap: { [key: string]: string } = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'orderNumber': 'order_number',
      'userId': 'user_id',
      'paymentStatus': 'payment_status',
      'total': 'total',
      'status': 'status'
    };
    const dbSortBy = sortByMap[sortBy as string] || 'created_at';

    // Build the where clause for filtering
    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;

    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);

    // Fetch orders with user details
    const [orders] = await sequelize.query(`
      SELECT 
        orders.*,
        users.first_name as user_first_name,
        users.last_name as user_last_name,
        users.email as user_email,
        users.phone as user_phone
      FROM orders
      LEFT JOIN users ON orders.user_id = users.id
      ${status || paymentStatus ? 'WHERE' : ''}
      ${status ? `orders.status = '${status}'` : ''}
      ${status && paymentStatus ? 'AND' : ''}
      ${paymentStatus ? `orders.payment_status = '${paymentStatus}'` : ''}
      ORDER BY orders.${dbSortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count for pagination
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM orders
      ${status || paymentStatus ? 'WHERE' : ''}
      ${status ? `status = '${status}'` : ''}
      ${status && paymentStatus ? 'AND' : ''}
      ${paymentStatus ? `payment_status = '${paymentStatus}'` : ''}
    `);
    const total = (countResult as any)[0]?.total || 0;

    // Parse JSON fields and map to camelCase for frontend
    const parsedOrders = (orders as any[]).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.user_id,
      userId: order.user_id,
      orderReviewId: order.order_review_id,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      billingAddress: order.billing_address && typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      paymentIntentId: order.payment_intent_id,
      transactionId: order.transaction_id,
      cardLast4: order.card_last4,
      cardBrand: order.card_brand,
      status: order.status,
      trackingNumber: order.tracking_number,
      shippingCarrier: order.shipping_carrier,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      estimatedDeliveryDate: order.estimated_delivery_date,
      customerNotes: order.customer_notes,
      adminNotes: order.admin_notes,
      internalNotes: order.internal_notes,
      metadata: order.metadata && typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      // Include user details
      user_first_name: order.user_first_name,
      user_last_name: order.user_last_name,
      user_email: order.user_email,
      user_phone: order.user_phone,
    }));

    return res.status(200).json({
      success: true,
      data: {
        orders: parsedOrders,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(Number(total) / Number(limit)),
          totalItems: Number(total),
          itemsPerPage: Number(limit)
        }
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get single order by ID (Admin)
 * @route GET /api/v1/orders/:id
 * @access Private (Admin only)
 */
export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const [orders] = await sequelize.query(`
      SELECT 
        orders.*,
        users.first_name as user_first_name,
        users.last_name as user_last_name,
        users.email as user_email,
        users.phone as user_phone
      FROM orders
      LEFT JOIN users ON orders.user_id = users.id
      WHERE orders.id = ?
    `, {
      replacements: [id]
    });

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const order = orders[0] as any;

    // Parse JSON fields and map to camelCase for frontend
    const parsedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.user_id,
      userId: order.user_id,
      orderReviewId: order.order_review_id,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      billingAddress: order.billing_address && typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      paymentIntentId: order.payment_intent_id,
      transactionId: order.transaction_id,
      cardLast4: order.card_last4,
      cardBrand: order.card_brand,
      status: order.status,
      trackingNumber: order.tracking_number,
      shippingCarrier: order.shipping_carrier,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      estimatedDeliveryDate: order.estimated_delivery_date,
      customerNotes: order.customer_notes,
      adminNotes: order.admin_notes,
      internalNotes: order.internal_notes,
      metadata: order.metadata && typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      // Include user details
      user_first_name: order.user_first_name,
      user_last_name: order.user_last_name,
      user_email: order.user_email,
      user_phone: order.user_phone,
    };

    return res.status(200).json({
      success: true,
      data: parsedOrder,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user's orders
 * @route GET /api/v1/orders/my-orders
 * @access Private (User)
 */
export const getUserOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
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
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, {
      replacements: [userId]
    });

    // Parse JSON fields and map to camelCase for frontend
    const parsedOrders = (orders as any[]).map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.user_id,
      userId: order.user_id,
      orderReviewId: order.order_review_id,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      billingAddress: order.billing_address && typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      paymentIntentId: order.payment_intent_id,
      transactionId: order.transaction_id,
      cardLast4: order.card_last4,
      cardBrand: order.card_brand,
      status: order.status,
      trackingNumber: order.tracking_number,
      shippingCarrier: order.shipping_carrier,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      estimatedDeliveryDate: order.estimated_delivery_date,
      customerNotes: order.customer_notes,
      adminNotes: order.admin_notes,
      internalNotes: order.internal_notes,
      metadata: order.metadata && typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: parsedOrders,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching user orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update order status (Admin)
 * @route PATCH /api/v1/orders/:id/status
 * @access Private (Admin only)
 */
export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber, shippingCarrier } = req.body;

    // Validate status
    const validStatuses = ['pending', 'preparing', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status',
        code: 'INVALID_STATUS',
        timestamp: new Date().toISOString(),
      });
    }

    // Build update fields
    const updates: string[] = [];
    const replacements: any[] = [];

    if (status) {
      updates.push('status = ?');
      replacements.push(status);
    }
    if (adminNotes !== undefined) {
      updates.push('admin_notes = ?');
      replacements.push(adminNotes);
    }
    if (trackingNumber !== undefined) {
      updates.push('tracking_number = ?');
      replacements.push(trackingNumber);
    }
    if (shippingCarrier !== undefined) {
      updates.push('shipping_carrier = ?');
      replacements.push(shippingCarrier);
    }
    
    // Set shipped_at timestamp if status is 'shipped' and not already set
    if (status === 'shipped') {
      updates.push('shipped_at = COALESCE(shipped_at, NOW())');
    }
    
    // Set delivered_at timestamp if status is 'delivered' and not already set
    if (status === 'delivered') {
      updates.push('delivered_at = COALESCE(delivered_at, NOW())');
    }

    // Always update updated_at
    updates.push('updated_at = NOW()');
    
    // Add id to replacements
    replacements.push(id);

    // Execute update
    await sequelize.query(`
      UPDATE orders 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, {
      replacements
    });

    // Fetch updated order
    const [orders] = await sequelize.query(`
      SELECT * FROM orders WHERE id = ?
    `, {
      replacements: [id]
    });

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const order = orders[0] as any;

    // Parse JSON fields and map to camelCase for frontend
    const parsedOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerId: order.user_id,
      userId: order.user_id,
      orderReviewId: order.order_review_id,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      shippingAddress: typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address,
      billingAddress: order.billing_address && typeof order.billing_address === 'string' ? JSON.parse(order.billing_address) : order.billing_address,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentProvider: order.payment_provider,
      paymentIntentId: order.payment_intent_id,
      transactionId: order.transaction_id,
      cardLast4: order.card_last4,
      cardBrand: order.card_brand,
      status: order.status,
      trackingNumber: order.tracking_number,
      shippingCarrier: order.shipping_carrier,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at,
      estimatedDeliveryDate: order.estimated_delivery_date,
      customerNotes: order.customer_notes,
      adminNotes: order.admin_notes,
      internalNotes: order.internal_notes,
      metadata: order.metadata && typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };

    // Emit WebSocket event for real-time updates
    try {
      const { getWebSocketService } = await import('../services/websocketService');
      const webSocketService = getWebSocketService();
      if (webSocketService) {
        webSocketService.emitOrderStatusChange(parseInt(id), {
          userId: order.user_id,
          status: order.status,
          originalStatus: status,
          trackingNumber: order.tracking_number,
          shippingCarrier: order.shipping_carrier,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (wsError) {
      logger.error('Error emitting WebSocket event:', wsError);
    }

    return res.status(200).json({
      success: true,
      data: parsedOrder,
      message: 'Order updated successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create order from order review (Internal helper function)
 * Called by webhook handler after payment success
 */
export const createOrderFromReview = async (
  orderReviewId: number,
  paymentDetails: {
    paymentIntentId: string;
    transactionId: string;
    cardLast4?: string;
    cardBrand?: string;
    paymentMethod: string;
    paymentProvider: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay' | 'square' | 'manual';
  },
  shippingDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }
): Promise<any> => {
  try {
    // Fetch the order review
    const [orderReviews] = await sequelize.query(`
      SELECT * FROM order_reviews WHERE id = ?
    `, {
      replacements: [orderReviewId]
    });

    if (!Array.isArray(orderReviews) || orderReviews.length === 0) {
      throw new Error(`Order review ${orderReviewId} not found`);
    }

    const orderReview = orderReviews[0] as any;

    // Parse order data
    const orderData = typeof orderReview.order_data === 'string' 
      ? JSON.parse(orderReview.order_data) 
      : orderReview.order_data;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${orderReviewId}`;

    // Create the order
    const [result] = await sequelize.query(`
      INSERT INTO orders (
        order_number,
        user_id,
        order_review_id,
        items,
        subtotal,
        shipping,
        tax,
        total,
        shipping_address,
        billing_address,
        payment_method,
        payment_status,
        payment_provider,
        payment_intent_id,
        transaction_id,
        card_last4,
        card_brand,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: [
        orderNumber,
        orderReview.user_id,
        orderReviewId,
        JSON.stringify(orderData),
        orderReview.subtotal,
        orderReview.shipping,
        orderReview.tax,
        orderReview.total,
        JSON.stringify(shippingDetails),
        JSON.stringify(shippingDetails), // Use same as shipping for now
        paymentDetails.paymentMethod,
        'completed',
        paymentDetails.paymentProvider,
        paymentDetails.paymentIntentId,
        paymentDetails.transactionId,
        paymentDetails.cardLast4 || null,
        paymentDetails.cardBrand || null,
        'preparing'
      ]
    });

    const orderId = (result as any).insertId;

    logger.info('Order created successfully', {
      orderId,
      orderNumber,
      orderReviewId,
      userId: orderReview.user_id
    });

    return {
      success: true,
      orderId,
      orderNumber
    };

  } catch (error: any) {
    logger.error('Error creating order from review:', error);
    throw error;
  }
};

