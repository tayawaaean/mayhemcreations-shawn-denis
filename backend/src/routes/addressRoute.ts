/**
 * Address Routes
 * Handles address management endpoints for admin panel
 */

import express from 'express';
import {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultOriginAddress
} from '../controllers/addressController';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route GET /api/v1/admin/addresses
 * @desc Get all addresses with optional type filter
 * @access Private (Admin only)
 */
router.get('/', getAllAddresses);

/**
 * @route GET /api/v1/admin/addresses/default/origin
 * @desc Get default origin address
 * @access Private (Admin only)
 */
router.get('/default/origin', getDefaultOriginAddress);

/**
 * @route GET /api/v1/admin/addresses/:id
 * @desc Get address by ID
 * @access Private (Admin only)
 */
router.get('/:id', getAddressById);

/**
 * @route POST /api/v1/admin/addresses
 * @desc Create new address
 * @access Private (Admin only)
 */
router.post('/', createAddress);

/**
 * @route PUT /api/v1/admin/addresses/:id
 * @desc Update address
 * @access Private (Admin only)
 */
router.put('/:id', updateAddress);

/**
 * @route PUT /api/v1/admin/addresses/:id/set-default
 * @desc Set address as default for its type
 * @access Private (Admin only)
 */
router.put('/:id/set-default', setDefaultAddress);

/**
 * @route DELETE /api/v1/admin/addresses/:id
 * @desc Delete address
 * @access Private (Admin only)
 */
router.delete('/:id', deleteAddress);

export default router;
