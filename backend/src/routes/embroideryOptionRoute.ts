import { Router } from 'express';
import {
  getEmbroideryOptions,
  getEmbroideryOptionById,
  createEmbroideryOption,
  updateEmbroideryOption,
  deleteEmbroideryOption,
  toggleEmbroideryOptionStatus
} from '../controllers/embroideryOptionController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * @route GET /api/v1/embroidery-options
 * @desc Get all embroidery options with optional filtering
 * @access Public
 */
router.get('/', getEmbroideryOptions);

/**
 * @route GET /api/v1/embroidery-options/:id
 * @desc Get embroidery option by ID
 * @access Public
 */
router.get('/:id', getEmbroideryOptionById);

/**
 * @route POST /api/v1/embroidery-options
 * @desc Create new embroidery option
 * @access Private (Admin/Seller only)
 */
router.post('/', authenticate, requireRole(['admin', 'seller']), createEmbroideryOption);

/**
 * @route PUT /api/v1/embroidery-options/:id
 * @desc Update embroidery option
 * @access Private (Admin/Seller only)
 */
router.put('/:id', authenticate, requireRole(['admin', 'seller']), updateEmbroideryOption);

/**
 * @route DELETE /api/v1/embroidery-options/:id
 * @desc Delete embroidery option
 * @access Private (Admin/Seller only)
 */
router.delete('/:id', authenticate, requireRole(['admin', 'seller']), deleteEmbroideryOption);

/**
 * @route PATCH /api/v1/embroidery-options/:id/toggle
 * @desc Toggle embroidery option active status
 * @access Private (Admin/Seller only)
 */
router.patch('/:id/toggle', authenticate, requireRole(['admin', 'seller']), toggleEmbroideryOptionStatus);

export default router;
