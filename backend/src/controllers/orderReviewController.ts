import { Request, Response, NextFunction } from 'express';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

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
        status ENUM('pending', 'approved', 'rejected', 'needs-changes') NOT NULL DEFAULT 'pending',
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
    const { items, subtotal, shipping, tax, total, submittedAt } = req.body;

    console.log('🔍 Submit for review request:', {
      userId,
      itemsCount: items?.length,
      items: items?.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        hasCustomization: !!item.customization
      })),
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

    // Create order review record using raw query with proper insertId handling
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
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
    `, {
      replacements: [
        userId,
        JSON.stringify(items),
        subtotal,
        shipping,
        tax,
        total,
        submittedAt ? new Date(submittedAt) : new Date()
      ]
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
        itemCount: items.length
      },
      message: 'Order submitted for review successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Order submitted for review by user ${userId}`, {
      userId,
      orderReviewId,
      itemCount: items.length,
      total
    });

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
        order_reviews.created_at,
        order_reviews.updated_at
      FROM order_reviews
      LEFT JOIN users u ON order_reviews.user_id = u.id
      ORDER BY order_reviews.created_at DESC
    `);

    console.log('📊 Found orders:', orders);

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
    const { status, adminNotes } = req.body;

    if (!['pending', 'approved', 'rejected', 'needs-changes', 'pending-payment', 'approved-processing'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, approved, rejected, needs-changes, pending-payment, approved-processing',
        code: 'INVALID_STATUS',
        timestamp: new Date().toISOString(),
      });
    }

    const [result] = await sequelize.query(`
      UPDATE order_reviews 
      SET status = ?, 
          admin_notes = ?,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, {
      replacements: [status, adminNotes || null, id]
    });

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order review not found',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

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

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        status,
        adminNotes,
        reviewedAt: new Date().toISOString()
      },
      message: 'Order review status updated successfully',
      timestamp: new Date().toISOString(),
    });

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
    const { pictureReplies } = req.body; // Array of { itemId, image, notes }

    if (!pictureReplies || !Array.isArray(pictureReplies)) {
      return res.status(400).json({
        success: false,
        message: 'Picture replies data is required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Add uploadedAt to each picture reply
    const pictureRepliesWithTimestamp = pictureReplies.map((reply: any) => ({
      ...reply,
      uploadedAt: new Date().toISOString()
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
    const { confirmations } = req.body; // Array of { itemId, confirmed, notes }

    if (!confirmations || !Array.isArray(confirmations)) {
      return res.status(400).json({
        success: false,
        message: 'Confirmations data is required',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // Update the order review with customer confirmations
    const [result] = await sequelize.query(`
      UPDATE order_reviews 
      SET customer_confirmations = ?,
          customer_confirmed_at = NOW(),
          updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `, {
      replacements: [JSON.stringify(confirmations), id, req.user?.id]
    });

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order review not found or not authorized',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        confirmations,
        confirmedAt: new Date().toISOString()
      },
      message: 'Picture confirmations submitted successfully',
      timestamp: new Date().toISOString(),
    });

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
