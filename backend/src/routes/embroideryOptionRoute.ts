import { Router } from 'express';
import {
  getEmbroideryOptions,
  getEmbroideryOptionById,
  createEmbroideryOption,
  updateEmbroideryOption,
  deleteEmbroideryOption,
  toggleEmbroideryOptionStatus
} from '../controllers/embroideryOptionController';

const router = Router();

// GET /api/v1/embroidery-options - Get all embroidery options with optional filtering
router.get('/', getEmbroideryOptions);

// GET /api/v1/embroidery-options/:id - Get embroidery option by ID
router.get('/:id', getEmbroideryOptionById);

// POST /api/v1/embroidery-options - Create new embroidery option
router.post('/', createEmbroideryOption);

// PUT /api/v1/embroidery-options/:id - Update embroidery option
router.put('/:id', updateEmbroideryOption);

// DELETE /api/v1/embroidery-options/:id - Delete embroidery option
router.delete('/:id', deleteEmbroideryOption);

// PATCH /api/v1/embroidery-options/:id/toggle - Toggle embroidery option active status
router.patch('/:id/toggle', toggleEmbroideryOptionStatus);

export default router;
