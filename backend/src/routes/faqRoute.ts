import { Router } from 'express';
import {
  getFAQs,
  getFAQById,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  updateFAQsOrder,
  getFAQCategories,
  toggleFAQStatus
} from '../controllers/faqController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

/**
 * FAQ Routes
 * Read operations are public, write operations require admin authentication
 */

/**
 * @route GET /api/v1/faqs
 * @desc Get all FAQs with optional filtering and pagination
 * @access Public
 */
router.get('/', getFAQs);

/**
 * @route GET /api/v1/faqs/categories
 * @desc Get all FAQ categories
 * @access Public
 */
router.get('/categories', getFAQCategories);

/**
 * @route GET /api/v1/faqs/:id
 * @desc Get a single FAQ by ID
 * @access Public
 */
router.get('/:id', getFAQById);

/**
 * @route POST /api/v1/faqs
 * @desc Create a new FAQ
 * @access Private (Admin only)
 */
router.post('/', hybridAuthenticate, requireRole(['admin']), createFAQ);

/**
 * @route PUT /api/v1/faqs/:id
 * @desc Update an FAQ
 * @access Private (Admin only)
 */
router.put('/:id', hybridAuthenticate, requireRole(['admin']), updateFAQ);

/**
 * @route DELETE /api/v1/faqs/:id
 * @desc Delete an FAQ
 * @access Private (Admin only)
 */
router.delete('/:id', hybridAuthenticate, requireRole(['admin']), deleteFAQ);

/**
 * @route PATCH /api/v1/faqs/:id/toggle
 * @desc Toggle FAQ status (active/inactive)
 * @access Private (Admin only)
 */
router.patch('/:id/toggle', hybridAuthenticate, requireRole(['admin']), toggleFAQStatus);

/**
 * @route PUT /api/v1/faqs/order
 * @desc Update FAQ sort order
 * @access Private (Admin only)
 */
router.put('/order', hybridAuthenticate, requireRole(['admin']), updateFAQsOrder);

export default router;

