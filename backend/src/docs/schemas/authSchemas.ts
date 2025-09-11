/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           example: SecurePass123!
 *           description: User's password
 *       example:
 *         email: user@example.com
 *         password: SecurePass123!
 * 
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: SecurePass123!
 *           description: User's password (minimum 8 characters)
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: John
 *           description: User's first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: Doe
 *           description: User's last name
 *         phone:
 *           type: string
 *           pattern: '^[\+]?[1-9][\d]{0,15}$'
 *           example: '+15551234567'
 *           description: User's phone number (optional)
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: '1990-01-01'
 *           description: User's date of birth (optional)
 *       example:
 *         email: user@example.com
 *         password: SecurePass123!
 *         firstName: John
 *         lastName: Doe
 *         phone: '+15551234567'
 *         dateOfBirth: '1990-01-01'
 * 
 *     LoginResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 sessionId:
 *                   type: string
 *                   example: sess_1234567890abcdef
 *                   description: Session identifier
 * 
 *     RegisterResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   example: 1
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *                 firstName:
 *                   type: string
 *                   example: John
 *                 lastName:
 *                   type: string
 *                   example: Doe
 *                 isEmailVerified:
 *                   type: boolean
 *                   example: false
 * 
 *     ProfileResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         role:
 *                           $ref: '#/components/schemas/Role'
 * 
 *     RefreshResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 refreshToken:
 *                   type: string
 *                   example: refresh_token_1234567890abcdef
 *                   description: New refresh token
 * 
 *     LogoutResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             message:
 *               type: string
 *               example: Logout successful
 * 
 *     HealthResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 environment:
 *                   type: string
 *                   example: development
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                   description: Server uptime in seconds
 *                 memory:
 *                   type: object
 *                   properties:
 *                     used:
 *                       type: number
 *                       example: 45.2
 *                     total:
 *                       type: number
 *                       example: 100
 *                   description: Memory usage in MB
 */
