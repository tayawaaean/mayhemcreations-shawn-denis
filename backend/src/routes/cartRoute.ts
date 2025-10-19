/**
 * Cart Routes
 * Handles cart-related API endpoints
 */

import { Router } from 'express';
import { sessionAuthenticate, requireRole } from '../middlewares/auth';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart,
} from '../controllers/cartController';

const router = Router();

/**
 * @route GET /api/v1/cart
 * @desc Get user's cart items
 * @access Private (Customer only)
 */
router.get('/', sessionAuthenticate, requireRole(['customer']), getCart);

/**
 * @route POST /api/v1/cart
 * @desc Add item to cart
 * @access Private (Customer only)
 */
router.post('/', sessionAuthenticate, requireRole(['customer']), addToCart);

/**
 * @route PUT /api/v1/cart/:itemId
 * @desc Update cart item quantity
 * @access Private (Customer only)
 */
router.put('/:itemId', sessionAuthenticate, requireRole(['customer']), updateCartItem);

/**
 * @route DELETE /api/v1/cart/:itemId
 * @desc Remove item from cart
 * @access Private (Customer only)
 */
router.delete('/:itemId', sessionAuthenticate, requireRole(['customer']), removeFromCart);

/**
 * @route DELETE /api/v1/cart
 * @desc Clear user's cart
 * @access Private (Customer only)
 */
router.delete('/', sessionAuthenticate, requireRole(['customer']), clearCart);

/**
 * @route POST /api/v1/cart/sync
 * @desc Sync cart from localStorage to database
 * @access Private (Customer only)
 */
router.post('/sync', sessionAuthenticate, requireRole(['customer']), syncCart);


export default router;
