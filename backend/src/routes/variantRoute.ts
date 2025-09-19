import { Router } from 'express';
import {
  getVariants,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  updateVariantInventory,
  getVariantInventoryStatus
} from '../controllers/variantController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * @route GET /api/v1/variants
 * @desc Get all variants with optional filtering
 * @access Public
 */
router.get('/', getVariants);

/**
 * @route GET /api/v1/variants/inventory/status
 * @desc Get variant inventory status
 * @access Public
 */
router.get('/inventory/status', getVariantInventoryStatus);

/**
 * @route GET /api/v1/variants/:id
 * @desc Get variant by ID
 * @access Public
 */
router.get('/:id', getVariantById);

/**
 * @route POST /api/v1/variants
 * @desc Create a new variant
 * @access Private (Admin/Seller only)
 */
router.post('/', authenticate, requireRole(['admin', 'seller']), createVariant);

/**
 * @route PUT /api/v1/variants/:id
 * @desc Update a variant
 * @access Private (Admin/Seller only)
 */
router.put('/:id', authenticate, requireRole(['admin', 'seller']), updateVariant);

/**
 * @route DELETE /api/v1/variants/:id
 * @desc Delete a variant
 * @access Private (Admin/Seller only)
 */
router.delete('/:id', authenticate, requireRole(['admin', 'seller']), deleteVariant);

/**
 * @route PUT /api/v1/variants/:id/inventory
 * @desc Update variant inventory (add, subtract, or set stock)
 * @access Private (Admin/Seller only)
 */
router.put('/:id/inventory', authenticate, requireRole(['admin', 'seller']), updateVariantInventory);

export default router;
