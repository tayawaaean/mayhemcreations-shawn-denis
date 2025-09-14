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
 * @access Public (no auth required)
 */
router.post('/', createVariant);

/**
 * @route PUT /api/v1/variants/:id
 * @desc Update a variant
 * @access Public (no auth required)
 */
router.put('/:id', updateVariant);

/**
 * @route DELETE /api/v1/variants/:id
 * @desc Delete a variant
 * @access Public (no auth required)
 */
router.delete('/:id', deleteVariant);

/**
 * @route PUT /api/v1/variants/:id/inventory
 * @desc Update variant inventory (add, subtract, or set stock)
 * @access Public (no auth required)
 */
router.put('/:id/inventory', updateVariantInventory);

export default router;
