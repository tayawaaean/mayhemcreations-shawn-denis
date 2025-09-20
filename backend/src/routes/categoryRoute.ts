import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats
} from '../controllers/categoryController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * Category Routes
 * Read operations are public, write operations require admin authentication
 */

/**
 * @route GET /api/v1/categories
 * @desc Get all categories with optional filtering and pagination
 * @access Public
 */
router.get('/', getCategories);

/**
 * @route GET /api/v1/categories/stats
 * @desc Get category statistics
 * @access Public
 */
router.get('/stats', getCategoryStats);

/**
 * @route GET /api/v1/categories/:id
 * @desc Get a single category by ID
 * @access Public
 */
router.get('/:id', getCategoryById);

/**
 * @route POST /api/v1/categories
 * @desc Create a new category
 * @access Private (Admin only)
 */
router.post('/', hybridAuthenticate, requireRole(['admin']), createCategory);

/**
 * @route PUT /api/v1/categories/:id
 * @desc Update a category
 * @access Private (Admin only)
 */
router.put('/:id', hybridAuthenticate, requireRole(['admin']), updateCategory);

/**
 * @route DELETE /api/v1/categories/:id
 * @desc Delete a category
 * @access Private (Admin only)
 */
router.delete('/:id', hybridAuthenticate, requireRole(['admin']), deleteCategory);

export default router;
