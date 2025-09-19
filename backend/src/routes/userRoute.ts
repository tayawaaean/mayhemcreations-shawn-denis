/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management endpoints for admin operations
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { UserController } from '../controllers/userController';
import { hybridAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Validation rules
const updateUserValidation = [
  param('id').isInt().withMessage('User ID must be an integer'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .custom((value) => {
      // Allow empty, null, undefined values
      if (!value || value === '' || value === null || value === undefined) {
        return true;
      }
      // For now, just check if it's a string with some basic phone-like format
      // This is more lenient than isMobilePhone validation
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/;
      return phoneRegex.test(value);
    })
    .withMessage('Please provide a valid phone number (at least 7 digits)'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('isEmailVerified must be a boolean'),
  body('isPhoneVerified')
    .optional()
    .isBoolean()
    .withMessage('isPhoneVerified must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('roleId')
    .optional()
    .isInt()
    .withMessage('Role ID must be an integer')
];

const updateStatusValidation = [
  param('id').isInt().withMessage('User ID must be an integer'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const getUserValidation = [
  param('id').isInt().withMessage('User ID must be an integer')
];

const getUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Status must be active, inactive, or all'),
  query('role')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Role name must be less than 50 characters'),
  query('verified')
    .optional()
    .isIn(['email', 'phone', 'both', 'none', 'all'])
    .withMessage('Verified must be email, phone, both, none, or all'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'lastLoginAt'])
    .withMessage('Sort field must be one of: createdAt, updatedAt, firstName, lastName, email, lastLoginAt'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// User routes - all require authentication and admin role
router.get('/', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getUsersValidation, 
  UserController.getUsers
);

router.get('/stats', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  UserController.getUserStats
);

router.get('/:id', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  getUserValidation, 
  UserController.getUserById
);

router.put('/:id', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  updateUserValidation, 
  UserController.updateUser
);

router.patch('/:id/status', 
  hybridAuthenticate, 
  requireRole(['admin', 'manager']), 
  updateStatusValidation, 
  UserController.updateUserStatus
);

export default router;
