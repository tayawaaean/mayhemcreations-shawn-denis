import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} from '../controllers/categoryController';

const router = Router();

/**
 * Category Routes
 * All operations are public (no authentication required)
 */

// GET /api/categories - Get all categories with optional filtering (PUBLIC)
router.get('/', getCategories);

// GET /api/categories/stats - Get category statistics (PUBLIC)
router.get('/stats', getCategoryStats);

// GET /api/categories/:id - Get a single category by ID (PUBLIC)
router.get('/:id', getCategoryById);

// POST /api/categories - Create a new category (PUBLIC)
router.post('/', createCategory);

// PUT /api/categories/:id - Update a category (PUBLIC)
router.put('/:id', updateCategory);

// DELETE /api/categories/:id - Delete a category (PUBLIC)
router.delete('/:id', deleteCategory);

export default router;
