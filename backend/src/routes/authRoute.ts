/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management endpoints
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { authenticate, validateSession, hybridAuthenticate } from '../middlewares/auth';
import { authRateLimit } from '../config/security';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Auth routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', authRateLimit, loginValidation, AuthController.login);
router.post('/logout', hybridAuthenticate, AuthController.logout);
router.get('/profile', authenticate, validateSession, AuthController.getProfile);
router.post('/refresh', authenticate, validateSession, AuthController.refreshSession);

// OAuth routes
router.post('/google', authRateLimit, AuthController.googleLogin);
router.get('/oauth/providers', authenticate, validateSession, AuthController.getOAuthProviders);
router.post('/oauth/unlink', authenticate, validateSession, AuthController.unlinkOAuthProvider);

/**
 * @swagger
 * /api/v1/auth/health:
 *   get:
 *     tags: [Authentication]
 *     summary: Auth service health check
 *     description: Check if the authentication service is running and healthy
 *     responses:
 *       200:
 *         description: Auth service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Auth service is running
 *             examples:
 *               success:
 *                 summary: Service healthy
 *                 value:
 *                   success: true
 *                   message: Auth service is running
 *                   timestamp: '2025-09-10T17:30:00.000Z'
 */
// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
