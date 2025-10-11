/**
 * Product Review Controller
 * Handles all product review operations
 */

import { Request, Response, NextFunction } from 'express';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import ProductReview from '../models/productReviewModel';

// Extend Express Request to include user information
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Create a new product review
 * @route POST /api/v1/reviews
 * @access Private (Customer only - must have purchased the product)
 */
export const createReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { productId, orderId, rating, title, comment, images } = req.body;

    // Log the incoming request for debugging
    logger.info('Creating review with data:', { 
      userId, 
      productId, 
      orderId, 
      rating, 
      title: title?.substring(0, 50), 
      hasImages: !!images 
    });

    // Validate required fields
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    if (!productId || !orderId || !rating || !title || !comment) {
      logger.error('Missing required fields:', { productId, orderId, rating, title, comment });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, orderId, rating, title, comment',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
        timestamp: new Date().toISOString(),
      });
    }

    // Skip custom embroidery products (they don't have numeric IDs)
    if (typeof productId === 'string' && productId === 'custom-embroidery') {
      return res.status(400).json({
        success: false,
        message: 'Custom embroidery items cannot be reviewed individually',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if order exists and belongs to user
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, status, order_data
      FROM order_reviews
      WHERE id = ? AND user_id = ?
    `, {
      replacements: [orderId, userId]
    });

    if (!Array.isArray(orderResult) || orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to you',
        timestamp: new Date().toISOString(),
      });
    }

    const order = orderResult[0] as any;

    // Check if order is delivered (can only review delivered orders)
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'You can only review products from delivered orders',
        timestamp: new Date().toISOString(),
      });
    }

    // Parse order data to verify product was in this order
    let orderData: any[] = [];
    try {
      orderData = typeof order.order_data === 'string' ? JSON.parse(order.order_data) : order.order_data;
    } catch (error) {
      logger.error('Error parsing order_data:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying product purchase',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if product exists in order (handle both string and number productId)
    const productInOrder = orderData.some((item: any) => {
      const itemProductId = typeof item.productId === 'string' ? parseInt(item.productId) : item.productId;
      return itemProductId === productId || item.productId === String(productId);
    });
    
    if (!productInOrder) {
      // Log for debugging
      logger.warn(`Product ${productId} not found in order ${orderId}. Order items:`, orderData.map(i => i.productId));
      return res.status(400).json({
        success: false,
        message: 'Product was not found in this order',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has already reviewed this product for this order
    const [existingReview] = await sequelize.query(`
      SELECT id FROM product_reviews
      WHERE product_id = ? AND user_id = ? AND order_id = ?
    `, {
      replacements: [productId, userId, orderId]
    });

    if (Array.isArray(existingReview) && existingReview.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product for this order',
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare review data for insertion
    const reviewData = {
      productId,
      userId,
      orderId,
      rating,
      title,
      comment,
      images: images ? JSON.stringify(images) : null
    };

    logger.info('Inserting review with data:', reviewData);

    // Create the review
    const [result] = await sequelize.query(`
      INSERT INTO product_reviews (
        product_id, user_id, order_id, rating, title, comment,
        status, is_verified, helpful_votes, images,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', true, 0, ?, NOW(), NOW())
    `, {
      replacements: [
        reviewData.productId,
        reviewData.userId,
        reviewData.orderId,
        reviewData.rating,
        reviewData.title,
        reviewData.comment,
        reviewData.images
      ]
    });

    const reviewId = (result as any).insertId;

    // Fetch the created review
    const [createdReview] = await sequelize.query(`
      SELECT * FROM product_reviews WHERE id = ?
    `, {
      replacements: [reviewId]
    });

    logger.info(`Product review created successfully: ${reviewId}`, {
      userId,
      productId,
      orderId,
      rating
    });

    return res.status(201).json({
      success: true,
      data: createdReview[0],
      message: 'Review submitted successfully. It will be published after admin approval.',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error creating product review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all reviews for a product
 * @route GET /api/v1/reviews/product/:productId
 * @access Public
 */
export const getProductReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { productId } = req.params;
    const { status = 'approved' } = req.query;

    const [reviews] = await sequelize.query(`
      SELECT 
        pr.*,
        u.first_name,
        u.last_name,
        u.email
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = ? AND pr.status = ?
      ORDER BY pr.created_at DESC
    `, {
      replacements: [productId, status]
    });

    // Calculate statistics
    const reviewArray = reviews as any[];
    const stats = {
      totalReviews: reviewArray.length,
      averageRating: reviewArray.length > 0 
        ? (reviewArray.reduce((sum, r) => sum + r.rating, 0) / reviewArray.length).toFixed(1)
        : 0,
      ratingDistribution: {
        5: reviewArray.filter(r => r.rating === 5).length,
        4: reviewArray.filter(r => r.rating === 4).length,
        3: reviewArray.filter(r => r.rating === 3).length,
        2: reviewArray.filter(r => r.rating === 2).length,
        1: reviewArray.filter(r => r.rating === 1).length,
      }
    };

    return res.status(200).json({
      success: true,
      data: {
        reviews: reviewArray,
        stats
      },
      message: 'Product reviews retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error getting product reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get product reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all reviews (Admin only)
 * @route GET /api/v1/reviews/admin/all
 * @access Private (Admin only)
 */
export const getAllReviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { status } = req.query;

    let whereClause = '';
    const replacements: any[] = [];

    if (status && status !== 'all') {
      whereClause = 'WHERE pr.status = ?';
      replacements.push(status);
    }

    const [reviews] = await sequelize.query(`
      SELECT 
        pr.*,
        u.first_name,
        u.last_name,
        u.email,
        p.title as product_title,
        p.sku as product_sku
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN products p ON pr.product_id = p.id
      ${whereClause}
      ORDER BY pr.created_at DESC
    `, {
      replacements
    });

    return res.status(200).json({
      success: true,
      data: reviews,
      message: 'All reviews retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error getting all reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update review status (Admin only)
 * @route PATCH /api/v1/reviews/admin/:id/status
 * @access Private (Admin only)
 */
export const updateReviewStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, approved, or rejected',
        timestamp: new Date().toISOString(),
      });
    }

    let query = `
      UPDATE product_reviews
      SET status = ?, updated_at = NOW()
    `;
    const replacements: any[] = [status];

    if (adminResponse) {
      query += `, admin_response = ?, admin_responded_at = NOW()`;
      replacements.push(adminResponse);
    }

    query += ` WHERE id = ?`;
    replacements.push(id);

    await sequelize.query(query, { replacements });

    // Fetch updated review
    const [updatedReview] = await sequelize.query(`
      SELECT pr.*, u.first_name, u.last_name, p.title as product_title
      FROM product_reviews pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN products p ON pr.product_id = p.id
      WHERE pr.id = ?
    `, {
      replacements: [id]
    });

    logger.info(`Review ${id} status updated to ${status}`);

    return res.status(200).json({
      success: true,
      data: updatedReview[0],
      message: `Review ${status} successfully`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error updating review status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update review status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete review (Admin only)
 * @route DELETE /api/v1/reviews/admin/:id
 * @access Private (Admin only)
 */
export const deleteReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    await sequelize.query(`
      DELETE FROM product_reviews WHERE id = ?
    `, {
      replacements: [id]
    });

    logger.info(`Review ${id} deleted successfully`);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error deleting review:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Mark review as helpful
 * @route POST /api/v1/reviews/:id/helpful
 * @access Public
 */
export const markReviewHelpful = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    await sequelize.query(`
      UPDATE product_reviews
      SET helpful_votes = helpful_votes + 1,
          updated_at = NOW()
      WHERE id = ?
    `, {
      replacements: [id]
    });

    // Fetch updated review
    const [updatedReview] = await sequelize.query(`
      SELECT * FROM product_reviews WHERE id = ?
    `, {
      replacements: [id]
    });

    return res.status(200).json({
      success: true,
      data: updatedReview[0],
      message: 'Review marked as helpful',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error marking review as helpful:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark review as helpful',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

