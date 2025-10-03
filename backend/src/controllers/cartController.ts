/**
 * Cart Controller
 * Handles cart operations for authenticated users
 */

import { Request, Response, NextFunction } from 'express';
import { Cart, Product } from '../models';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Get user's cart items
 * @route GET /api/v1/cart
 * @access Private (Customer only)
 */
export const getCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const cartItems = await Cart.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });

    // Fetch product details for regular products (not custom items)
    const productIds = cartItems
      .map(item => item.productId)
      .filter(id => typeof id === 'string' && !isNaN(Number(id)))
      .map(id => Number(id));

    const products = productIds.length > 0 
      ? await Product.findAll({
          where: { id: productIds },
          attributes: [
            'id', 'title', 'slug', 'description', 'price', 'image', 'alt',
            'status', 'featured', 'badges', 'availableColors', 'availableSizes',
            'averageRating', 'totalReviews', 'stock', 'sku', 'weight', 'dimensions',
            'materials', 'careInstructions', 'hasSizing'
          ],
        })
      : [];

    // Create a map for quick product lookup
    const productMap = new Map(products.map(product => [product.id, product]));

    // Transform cart items to match frontend format
    const transformedItems = cartItems.map(item => {
      const productId = item.productId === 999999 ? 'custom-embroidery' : item.productId.toString();
      const product = typeof item.productId === 'string' && !isNaN(Number(item.productId))
        ? productMap.get(Number(item.productId))
        : null;

      return {
        id: item.id,
        productId,
        quantity: item.quantity,
        customization: item.customization ? item.getCustomizationData() : undefined,
        reviewStatus: item.reviewStatus,
        product, // Product details for regular products, null for custom items
      };
    });

    res.status(200).json({
      success: true,
      data: transformedItems,
      message: 'Cart retrieved successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cart retrieved for user ${userId}`, {
      userId,
      itemCount: cartItems.length,
    });
  } catch (error: any) {
    logger.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Add item to cart
 * @route POST /api/v1/cart
 * @access Private (Customer only)
 */
export const addToCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId, quantity = 1, customization } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'Product ID is required',
        code: 'MISSING_PRODUCT_ID',
      });
      return;
    }

    // For custom embroidery items, skip product validation
    let product = null;
    let actualProductId = productId;
    
    if (productId === 'custom-embroidery') {
      // Keep the string identifier for custom embroidery
      actualProductId = 'custom-embroidery';
    } else {
      // Validate product exists and is active for regular products
      product = await Product.findOne({
        where: { 
          id: productId,
          status: 'active'
        },
      });

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found or inactive',
          code: 'PRODUCT_NOT_FOUND',
        });
        return;
      }
    }

    // Check if item already exists in cart with same customization
    const existingItem = await Cart.findOne({
      where: { 
        userId,
        productId: actualProductId,
        customization: customization ? JSON.stringify(customization) : null,
      },
    });

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      
      // Validate stock (skip for custom embroidery items)
      if (product && product.stock && newQuantity > product.stock) {
        res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`,
          code: 'INSUFFICIENT_STOCK',
        });
        return;
      }

      await existingItem.update({ 
        quantity: newQuantity,
        customization: customization ? JSON.stringify(customization) : existingItem.customization,
      });

      res.status(200).json({
        success: true,
        data: {
          id: existingItem.id,
          productId: productId, // Return original productId (custom-embroidery or numeric)
          quantity: existingItem.quantity,
          customization: existingItem.customization ? existingItem.getCustomizationData() : undefined,
          reviewStatus: existingItem.reviewStatus,
        },
        message: 'Cart item updated successfully',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Create new cart item
      const now = new Date();
      const cartItem = await Cart.create({
        userId,
        productId: actualProductId,
        quantity,
        customization: customization ? JSON.stringify(customization) : undefined,
        reviewStatus: customization ? 'pending' : 'approved', // Only customized items need review
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({
        success: true,
        data: {
          id: cartItem.id,
          productId: productId, // Return original productId (custom-embroidery or numeric)
          quantity: cartItem.quantity,
          customization: cartItem.customization ? cartItem.getCustomizationData() : undefined,
          reviewStatus: cartItem.reviewStatus,
        },
        message: 'Item added to cart successfully',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Cart item added/updated for user ${userId}`, {
      userId,
      productId,
      quantity,
      hasCustomization: !!customization,
    });
  } catch (error: any) {
    logger.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update cart item quantity
 * @route PUT /api/v1/cart/:itemId
 * @access Private (Customer only)
 */
export const updateCartItem = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity, customization } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!quantity || quantity < 1) {
      res.status(400).json({
        success: false,
        message: 'Valid quantity is required',
        code: 'INVALID_QUANTITY',
      });
      return;
    }

    const cartItem = await Cart.findOne({
      where: { 
        id: itemId,
        userId,
      },
    });

    if (!cartItem) {
      res.status(404).json({
        success: false,
        message: 'Cart item not found',
        code: 'CART_ITEM_NOT_FOUND',
      });
      return;
    }

    // Validate stock for regular products
    if (typeof cartItem.productId === 'string' && !isNaN(Number(cartItem.productId))) {
      const product = await Product.findByPk(Number(cartItem.productId));
      if (product && product.stock && quantity > product.stock) {
        res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`,
          code: 'INSUFFICIENT_STOCK',
        });
        return;
      }
    }

    await cartItem.update({
      quantity,
      customization: customization ? JSON.stringify(customization) : cartItem.customization,
    });

    res.status(200).json({
      success: true,
      data: {
        id: cartItem.id,
        productId: cartItem.productId.toString(),
        quantity: cartItem.quantity,
        customization: cartItem.customization ? cartItem.getCustomizationData() : undefined,
      },
      message: 'Cart item updated successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cart item updated for user ${userId}`, {
      userId,
      itemId,
      quantity,
      hasCustomization: !!customization,
    });
  } catch (error: any) {
    logger.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Remove item from cart
 * @route DELETE /api/v1/cart/:itemId
 * @access Private (Customer only)
 */
export const removeFromCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { itemId } = req.params;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const cartItem = await Cart.findOne({
      where: { 
        id: itemId,
        userId,
      },
    });

    if (!cartItem) {
      res.status(404).json({
        success: false,
        message: 'Cart item not found',
        code: 'CART_ITEM_NOT_FOUND',
      });
      return;
    }

    await cartItem.destroy();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cart item removed for user ${userId}`, {
      userId,
      itemId,
    });
  } catch (error: any) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Clear user's cart
 * @route DELETE /api/v1/cart
 * @access Private (Customer only)
 */


export const clearCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const deletedCount = await Cart.destroy({
      where: { userId },
    });

    res.status(200).json({
      success: true,
      data: { deletedCount },
      message: 'Cart cleared successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cart cleared for user ${userId}`, {
      userId,
      deletedCount,
    });
  } catch (error: any) {
    logger.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Sync cart from localStorage to database
 * @route POST /api/v1/cart/sync
 * @access Private (Customer only)
 */
export const syncCart = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { items } = req.body; // Array of cart items from localStorage

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!Array.isArray(items)) {
      res.status(400).json({
        success: false,
        message: 'Items array is required',
        code: 'INVALID_ITEMS',
      });
      return;
    }

    // Only sync if there are items to sync
    if (items.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        message: 'No items to sync',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Clear existing cart only when there are items to sync
    await Cart.destroy({ where: { userId } });

    // Add new items
    const cartItems = [];
    for (const item of items) {
      if (item.productId && item.quantity > 0) {
        const now = new Date();
        const cartItem = await Cart.create({
          userId,
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customization ? JSON.stringify(item.customization) : undefined,
          reviewStatus: 'pending', // All synced items start as pending review
          createdAt: now,
          updatedAt: now,
        });
        cartItems.push(cartItem);
      }
    }

    res.status(200).json({
      success: true,
      data: cartItems.map(item => ({
        id: item.id,
        productId: item.productId === 999999 ? 'custom-embroidery' : item.productId.toString(),
        quantity: item.quantity,
        customization: item.customization ? item.getCustomizationData() : undefined,
        reviewStatus: item.reviewStatus,
      })),
      message: 'Cart synced successfully',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Cart synced for user ${userId}`, {
      userId,
      itemCount: cartItems.length,
    });
  } catch (error: any) {
    logger.error('Sync cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
};
