import express from 'express';
import { ContactController } from '../controllers/contactController';
import { sessionAuthenticate, requireRole } from '../middlewares/auth';

// Create router instance
const router = express.Router();

/**
 * POST /api/v1/contact
 * Submit a contact form (Public - No authentication required)
 * Body: { name, email, phone?, company?, projectType, quantity?, message }
 */
router.post('/', ContactController.submitContact);

/**
 * GET /api/v1/contact
 * Get all contact submissions (Admin only)
 * Query params: status?, limit?, offset?
 */
router.get(
  '/',
  sessionAuthenticate,
  requireRole(['admin', 'manager']),
  ContactController.getAllContacts
);

/**
 * GET /api/v1/contact/:id
 * Get a single contact by ID (Admin only)
 */
router.get(
  '/:id',
  sessionAuthenticate,
  requireRole(['admin', 'manager']),
  ContactController.getContactById
);

/**
 * PATCH /api/v1/contact/:id/status
 * Update contact status (Admin only)
 * Body: { status: 'new' | 'read' | 'responded' | 'archived' }
 */
router.patch(
  '/:id/status',
  sessionAuthenticate,
  requireRole(['admin', 'manager']),
  ContactController.updateContactStatus
);

/**
 * DELETE /api/v1/contact/:id
 * Delete a contact submission (Admin only)
 */
router.delete(
  '/:id',
  sessionAuthenticate,
  requireRole(['admin']),
  ContactController.deleteContact
);

export default router;

