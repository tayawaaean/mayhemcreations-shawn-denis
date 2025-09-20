import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  updateInventory,
  getInventoryStatus,
  bulkUpdateInventory
} from '../controllers/productController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';

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
 * @access Private (Admin/Seller only)
 */
router.post('/', hybridAuthenticate, requireRole(['admin', 'seller']), createProduct);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update a product
 * @access Private (Admin/Seller only)
 */
router.put('/:id', hybridAuthenticate, requireRole(['admin', 'seller']), updateProduct);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Delete a product
 * @access Private (Admin/Seller only)
 */
router.delete('/:id', hybridAuthenticate, requireRole(['admin', 'seller']), deleteProduct);

/**
 * @route PUT /api/v1/products/:id/inventory
 * @desc Update product inventory (add, subtract, or set stock)
 * @access Private (Admin/Seller only)
 */
router.put('/:id/inventory', hybridAuthenticate, requireRole(['admin', 'seller']), updateInventory);

/**
 * @route GET /api/v1/products/inventory/status
 * @desc Get inventory status for products (low stock, out of stock, etc.)
 * @access Public
 */
router.get('/inventory/status', getInventoryStatus);

/**
 * @route PUT /api/v1/products/inventory/bulk
 * @desc Bulk update inventory for multiple products
 * @access Private (Admin/Seller only)
 */
router.put('/inventory/bulk', hybridAuthenticate, requireRole(['admin', 'seller']), bulkUpdateInventory);

export default router;
