/**
 * Cart Routes
 * Handles cart-related API endpoints
 */

import { Router } from 'express';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';
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
router.get('/', hybridAuthenticate, requireRole(['customer']), getCart);

/**
 * @route POST /api/v1/cart
 * @desc Add item to cart
 * @access Private (Customer only)
 */
router.post('/', hybridAuthenticate, requireRole(['customer']), addToCart);

/**
 * @route PUT /api/v1/cart/:itemId
 * @desc Update cart item quantity
 * @access Private (Customer only)
 */
router.put('/:itemId', hybridAuthenticate, requireRole(['customer']), updateCartItem);

/**
 * @route DELETE /api/v1/cart/:itemId
 * @desc Remove item from cart
 * @access Private (Customer only)
 */
router.delete('/:itemId', hybridAuthenticate, requireRole(['customer']), removeFromCart);

/**
 * @route DELETE /api/v1/cart
 * @desc Clear user's cart
 * @access Private (Customer only)
 */
router.delete('/', hybridAuthenticate, requireRole(['customer']), clearCart);

/**
 * @route POST /api/v1/cart/sync
 * @desc Sync cart from localStorage to database
 * @access Private (Customer only)
 */
router.post('/sync', hybridAuthenticate, requireRole(['customer']), syncCart);


export default router;
