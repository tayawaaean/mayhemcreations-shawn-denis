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
  // Generate unique request ID for tracking
  const requestId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const userId = req.user?.id;
    const { productId, orderId, rating, title, comment, images } = req.body;

    // Log the incoming request for debugging
    logger.info(`[${requestId}] 📝 Creating review with data:`, { 
      userId, 
      productId: productId,
      productIdType: typeof productId,
      orderId: orderId,
      orderIdType: typeof orderId,
      rating, 
      title: title?.substring(0, 50), 
      comment: comment?.substring(0, 50),
      hasImages: !!images,
      imageCount: images?.length 
    });

    // Validate required fields
    if (!userId) {
      logger.error(`[${requestId}] ❌ User not authenticated`);
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    if (!productId || !orderId || !rating || !title || !comment) {
      logger.error(`[${requestId}] ❌ Missing required fields:`, { 
        hasProductId: !!productId, 
        hasOrderId: !!orderId, 
        hasRating: !!rating, 
        hasTitle: !!title, 
        hasComment: !!comment,
        productId,
        orderId,
        rating,
        title,
        comment
      });
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

    // Check if order exists and belongs to user
    logger.info('🔍 Checking order:', { orderId, userId });
    const [orderResult] = await sequelize.query(`
      SELECT id, user_id, status, order_data
      FROM order_reviews
      WHERE id = ? AND user_id = ?
    `, {
      replacements: [orderId, userId]
    });

    logger.info('📦 Order query result:', { 
      found: Array.isArray(orderResult) && orderResult.length > 0,
      resultCount: Array.isArray(orderResult) ? orderResult.length : 0 
    });

    if (!Array.isArray(orderResult) || orderResult.length === 0) {
      logger.error('❌ Order not found or does not belong to user:', { orderId, userId });
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to you',
        timestamp: new Date().toISOString(),
      });
    }

    const order = orderResult[0] as any;
    logger.info('📦 Order status:', { orderId, status: order.status });

    // Check if order is delivered (can only review delivered orders)
    if (order.status !== 'delivered') {
      logger.error('❌ Order not delivered yet:', { orderId, status: order.status });
      return res.status(400).json({
        success: false,
        message: `You can only review products from delivered orders. Current status: ${order.status}`,
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
    logger.info('🔍 Checking if product is in order:', { 
      productId, 
      productIdType: typeof productId,
      orderDataLength: orderData.length,
      orderProducts: orderData.map(i => ({ 
        productId: i.productId, 
        type: typeof i.productId,
        productName: i.productName 
      }))
    });
    
    const productInOrder = orderData.some((item: any) => {
      // Handle custom embroidery string ID
      if (productId === 'custom-embroidery' && item.productId === 'custom-embroidery') {
        logger.info('✅ Custom embroidery product found in order');
        return true;
      }
      
      // Handle numeric product IDs (regular products)
      const itemProductId = typeof item.productId === 'string' ? parseInt(item.productId) : item.productId;
      const numericProductId = typeof productId === 'string' ? parseInt(productId) : productId;
      
      const matches = !isNaN(itemProductId) && !isNaN(numericProductId) && itemProductId === numericProductId;
      if (matches) {
        logger.info('✅ Product found in order:', { itemProductId, numericProductId });
      }
      return matches;
    });
    
    if (!productInOrder) {
      // Log for debugging
      logger.error('❌ Product not found in order:', { 
        productId, 
        orderId, 
        orderProducts: orderData.map(i => i.productId) 
      });
      return res.status(400).json({
        success: false,
        message: 'Product was not found in this order',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has already reviewed this product for this order
    logger.info('🔍 Checking for existing review:', { productId, userId, orderId });
    const [existingReview] = await sequelize.query(`
      SELECT id FROM product_reviews
      WHERE product_id = ? AND user_id = ? AND order_id = ?
    `, {
      replacements: [productId, userId, orderId]
    });

    if (Array.isArray(existingReview) && existingReview.length > 0) {
      logger.error('❌ Duplicate review attempt:', { productId, userId, orderId });
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product for this order',
        timestamp: new Date().toISOString(),
      });
    }
    
    logger.info('✅ All validations passed, creating review');

    // Ensure productId is a number (convert if string number)
    const numericProductId = typeof productId === 'string' && !isNaN(Number(productId)) 
      ? Number(productId) 
      : productId;

    // Prepare review data for insertion
    const reviewData = {
      productId: numericProductId,
      userId: userId,
      orderId: orderId,
      rating: rating,
      title: title,
      comment: comment,
      images: images ? JSON.stringify(images) : null
    };

    logger.info('📝 Inserting review with data:', {
      productId: reviewData.productId,
      productIdType: typeof reviewData.productId,
      userId: reviewData.userId,
      userIdType: typeof reviewData.userId,
      orderId: reviewData.orderId,
      orderIdType: typeof reviewData.orderId,
      rating: reviewData.rating,
      ratingType: typeof reviewData.rating,
      titleLength: reviewData.title?.length,
      commentLength: reviewData.comment?.length,
      hasImages: !!reviewData.images
    });

    // Validate all required fields are not undefined before insertion
    if (
      reviewData.productId === undefined ||
      reviewData.userId === undefined ||
      reviewData.orderId === undefined ||
      reviewData.rating === undefined ||
      reviewData.title === undefined ||
      reviewData.comment === undefined
    ) {
      logger.error('❌ One or more required fields are undefined:', reviewData);
      return res.status(400).json({
        success: false,
        message: 'Invalid review data - missing required fields',
        timestamp: new Date().toISOString(),
      });
    }

    // Prepare replacements array and log each value
    const replacements = [
      reviewData.productId,
      reviewData.userId,
      reviewData.orderId,
      reviewData.rating,
      reviewData.title,
      reviewData.comment,
      reviewData.images
    ];

    // Log each replacement value with its position
    logger.info('🔍 SQL Replacements Array:', replacements.map((val, idx) => ({
      position: idx,
      value: val,
      type: typeof val,
      isUndefined: val === undefined,
      isNull: val === null
    })));

    // Double-check no undefined values
    const undefinedIndices = replacements
      .map((val, idx) => val === undefined ? idx : -1)
      .filter(idx => idx !== -1);

    if (undefinedIndices.length > 0) {
      logger.error('❌ Found undefined values at positions:', undefinedIndices);
      logger.error('❌ Full replacements array:', replacements);
      logger.error('❌ Review data object:', reviewData);
      return res.status(400).json({
        success: false,
        message: 'Internal error: Some review data is missing. Please try again.',
        timestamp: new Date().toISOString(),
      });
    }

    // Create the review
    logger.info(`[${requestId}] ✅ About to execute SQL INSERT`);
    logger.info(`[${requestId}] ✅ Replacements being sent to SQL:`, replacements);
    
    const [result] = await sequelize.query(`
      INSERT INTO product_reviews (
        product_id, user_id, order_id, rating, title, comment,
        status, is_verified, helpful_votes, images,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', true, 0, ?, NOW(), NOW())
    `, {
      replacements: replacements
    });

    logger.info(`[${requestId}] ✅ SQL INSERT completed successfully`);
    logger.info(`[${requestId}] 🔍 Result object:`, result);
    logger.info(`[${requestId}] 🔍 Result type:`, typeof result);
    logger.info(`[${requestId}] 🔍 Result is array:`, Array.isArray(result));

    // Get the inserted ID - Sequelize raw queries return it differently
    let reviewId;
    if (Array.isArray(result) && result.length > 0) {
      reviewId = (result[0] as any)?.insertId || (result[0] as any);
    } else if (result && typeof result === 'object') {
      reviewId = (result as any).insertId || (result as any)[0];
    }

    logger.info(`[${requestId}] ✅ Got reviewId: ${reviewId}`);

    // If still undefined, query for the last inserted ID
    if (!reviewId) {
      logger.warn(`[${requestId}] ⚠️ reviewId is undefined, querying LAST_INSERT_ID()`);
      const [lastIdResult] = await sequelize.query('SELECT LAST_INSERT_ID() as id');
      reviewId = Array.isArray(lastIdResult) && lastIdResult.length > 0 
        ? (lastIdResult[0] as any).id 
        : undefined;
      logger.info(`[${requestId}] ✅ LAST_INSERT_ID() returned: ${reviewId}`);
    }

    if (!reviewId) {
      throw new Error('Failed to get review ID after insert');
    }

    // Fetch the created review
    logger.info(`[${requestId}] 🔍 Fetching created review with ID: ${reviewId}`);
    const [createdReview] = await sequelize.query(`
      SELECT * FROM product_reviews WHERE id = ?
    `, {
      replacements: [reviewId]
    });

    logger.info(`[${requestId}] ✅ Product review created successfully: ${reviewId}`, {
      userId,
      productId,
      orderId,
      rating
    });

    logger.info(`[${requestId}] ✅ Sending success response to client`);
    
    return res.status(201).json({
      success: true,
      data: createdReview[0],
      message: 'Review submitted successfully. It will be published after admin approval.',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error(`[${requestId}] ❌ CATCH BLOCK - Error creating product review`);
    logger.error(`[${requestId}] ❌ Error object:`, JSON.stringify(error, null, 2));
    logger.error(`[${requestId}] ❌ Error message: "${error?.message || 'NO MESSAGE'}"`);
    logger.error(`[${requestId}] ❌ Error name: "${error?.name || 'NO NAME'}"`);
    logger.error(`[${requestId}] ❌ Error stack:`, error?.stack || 'NO STACK');
    logger.error(`[${requestId}] ❌ Request body:`, JSON.stringify(req.body, null, 2));
    logger.error(`[${requestId}] ❌ User ID: ${req.user?.id || 'NO USER'}`);
    logger.error(`[${requestId}] ❌ Error type: ${typeof error}`);
    logger.error(`[${requestId}] ❌ Error is Error instance: ${error instanceof Error}`);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create review. Please try again.',
      error: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined,
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
 * Get all reviews by the current user
 * @route GET /api/v1/reviews/my-reviews
 * @access Private (Customer only)
 */
export const getMyReviews = async (
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
        timestamp: new Date().toISOString(),
      });
    }

    // Get all reviews by this user
    const [reviews] = await sequelize.query(`
      SELECT 
        pr.*,
        p.title as product_title,
        p.sku as product_sku
      FROM product_reviews pr
      LEFT JOIN products p ON pr.product_id = p.id
      WHERE pr.user_id = ?
      ORDER BY pr.created_at DESC
    `, {
      replacements: [userId]
    });

    // Transform reviews to proper format
    const transformedReviews = (reviews as any[]).map(review => ({
      id: review.id,
      productId: review.product_id,
      orderId: review.order_id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      status: review.status,
      isVerified: review.is_verified,
      helpfulVotes: review.helpful_votes,
      images: review.images ? JSON.parse(review.images) : null,
      adminResponse: review.admin_response,
      adminRespondedAt: review.admin_responded_at,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      productTitle: review.product_title,
      productSku: review.product_sku,
    }));

    return res.status(200).json({
      success: true,
      data: transformedReviews,
      message: 'Reviews retrieved successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    logger.error('Error fetching user reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
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

