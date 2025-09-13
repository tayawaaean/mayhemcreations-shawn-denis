import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
} from '../controllers/productController';

const router = Router();

/**
 * @route GET /api/v1/products
 * @desc Get all products with optional filtering and pagination
 * @access Public
 */
router.get('/', getProducts);

/**
 * @route GET /api/v1/products/stats
 * @desc Get product statistics
 * @access Public
 */
router.get('/stats', getProductStats);

/**
 * @route GET /api/v1/products/:id
 * @desc Get product by ID
 * @access Public
 */
router.get('/:id', getProductById);

/**
 * @route GET /api/v1/products/slug/:slug
 * @desc Get product by slug
 * @access Public
 */
router.get('/slug/:slug', getProductBySlug);

/**
 * @route POST /api/v1/products
 * @desc Create a new product
 * @access Public (no auth required)
 */
router.post('/', createProduct);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update a product
 * @access Public (no auth required)
 */
router.put('/:id', updateProduct);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Delete a product
 * @access Public (no auth required)
 */
router.delete('/:id', deleteProduct);

export default router;
