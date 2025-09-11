import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { User, Role, ROLES, DEFAULT_ROLE_PERMISSIONS } from '../models';
import { SessionService } from '../services/sessionService';
import { OAuthService } from '../services/oauthService';
import { logger } from '../utils/logger';

// Session types are now defined in types/session.d.ts

// Auth controller class
export class AuthController {
  /**
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     tags: [Authentication]
   *     summary: Register a new user account
   *     description: Creates a new user account with the provided information. The user will be assigned the default customer role.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *           examples:
   *             validUser:
   *               summary: Valid user registration
   *               value:
   *                 email: user@example.com
   *                 password: SecurePass123!
   *                 firstName: John
   *                 lastName: Doe
   *                 phone: '+15551234567'
   *                 dateOfBirth: '1990-01-01'
   *             minimalUser:
   *               summary: Minimal required fields
   *               value:
   *                 email: minimal@example.com
   *                 password: SecurePass123!
   *                 firstName: Jane
   *                 lastName: Smith
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RegisterResponse'
   *             examples:
   *               success:
   *                 summary: Successful registration
   *                 value:
   *                   success: true
   *                   message: User registered successfully. Please check your email for verification.
   *                   data:
   *                     userId: 1
   *                     email: user@example.com
   *                     firstName: John
   *                     lastName: Doe
   *                     isEmailVerified: false
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               validationError:
   *                 summary: Validation failed
   *                 value:
   *                   success: false
   *                   message: Validation failed
   *                   errors:
   *                     - msg: Please provide a valid email address
   *                       param: email
   *                       location: body
   *                     - msg: Password must be at least 8 characters long
   *                       param: password
   *                       location: body
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       409:
   *         description: User already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               userExists:
   *                 summary: Email already registered
   *                 value:
   *                   success: false
   *                   message: User with this email already exists
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               serverError:
   *                 summary: Server error
   *                 value:
   *                   success: false
   *                   message: Internal server error
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { email, password, firstName, lastName, phone, dateOfBirth } = req.body;

      // Validate password strength
      const passwordValidation = User.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // Get default customer role
      let role = await Role.findOne({ where: { name: ROLES.CUSTOMER } });
      if (!role) {
        // Create default roles if they don't exist
        await this.createDefaultRoles();
        role = await Role.findOne({ where: { name: ROLES.CUSTOMER } });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        roleId: role!.id,
      });

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      await user.update({
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Get user with role for session creation
      const userWithRole = await User.findByPk(user.id, {
        include: [{ model: Role, as: 'role' }]
      });

      if (!userWithRole) {
        res.status(500).json({
          success: false,
          message: 'User created but could not be retrieved',
        });
        return;
      }

      // Create session for the new user
      const sessionResult = await SessionService.createSession(
        req,
        userWithRole,
        (userWithRole as any).role,
        req.get('User-Agent') || 'Unknown',
        req.ip || '127.0.0.1'
      );

      // Update user last login
      await userWithRole.update({ lastLoginAt: new Date() });

      // Log registration
      logger.info(`New user registered: ${email}`, {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        sessionId: sessionResult.sessionId,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          user: {
            id: userWithRole.id,
            email: userWithRole.email,
            firstName: userWithRole.firstName,
            lastName: userWithRole.lastName,
            role: (userWithRole as any).role.name,
            permissions: (userWithRole as any).role.permissions,
            isEmailVerified: userWithRole.isEmailVerified,
            avatar: userWithRole.avatar
          },
          sessionId: sessionResult.sessionId,
          accessToken: sessionResult.accessToken,
          refreshToken: sessionResult.refreshToken
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     tags: [Authentication]
   *     summary: Authenticate user and create session
   *     description: Authenticates a user with email and password, creates a session, and returns user information with role details.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *           examples:
   *             validLogin:
   *               summary: Valid login credentials
   *               value:
   *                 email: user@example.com
   *                 password: SecurePass123!
   *             adminLogin:
   *               summary: Admin user login
   *               value:
   *                 email: admin@mayhemcreation.com
   *                 password: AdminPass123!
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *             examples:
   *               success:
   *                 summary: Successful login
   *                 value:
   *                   success: true
   *                   message: Login successful
   *                   data:
   *                     user:
   *                       id: 1
   *                       email: user@example.com
   *                       firstName: John
   *                       lastName: Doe
   *                       role: customer
   *                       permissions: ['products:read', 'orders:read']
   *                       isEmailVerified: true
   *                       isPhoneVerified: false
   *                     sessionId: sess_1234567890abcdef
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               validationError:
   *                 summary: Validation failed
   *                 value:
   *                   success: false
   *                   message: Validation failed
   *                   errors:
   *                     - msg: Please provide a valid email address
   *                       param: email
   *                       location: body
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Authentication failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               invalidCredentials:
   *                 summary: Invalid credentials
   *                 value:
   *                   success: false
   *                   message: Invalid email or password
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *               accountLocked:
   *                 summary: Account locked
   *                 value:
   *                   success: false
   *                   message: Account is locked due to too many failed login attempts
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const { email, password, expectedRole } = req.body;

      // Find user with role
      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: 'role' }],
      }) as any; // Type assertion needed for included associations

      logger.info('Login attempt', { email, userFound: !!user });

      if (!user) {
        logger.warn('User not found for login', { email });
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Check if account is locked
      if (user.isLocked()) {
        res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts',
        });
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.',
        });
        return;
      }

      // Role validation - prevent cross-role access
      if (expectedRole) {
        const userRole = user.role.name;
        const allowedRoles = AuthController.getAllowedRolesForLogin(expectedRole);
        
        if (!allowedRoles.includes(userRole)) {
          logger.warn('Role validation failed', { 
            email, 
            userId: user.id, 
            userRole, 
            expectedRole,
            allowedRoles 
          });
          
          res.status(403).json({
            success: false,
            message: `Access denied. This account (${userRole}) cannot access ${expectedRole} area.`,
          });
          return;
        }
      }

      // Verify password
      const isPasswordValid = await user.checkPassword(password);
      logger.info('Password verification', { 
        email, 
        userId: user.id, 
        isPasswordValid,
        userPasswordHash: user.password.substring(0, 20) + '...',
        needsRehash: user.needsPasswordRehash()
      });
      
      if (!isPasswordValid) {
        logger.warn('Invalid password for user', { email, userId: user.id });
        // Increment failed login attempts
        await user.incLoginAttempts();
        
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Check if password needs rehashing for security updates
      if (user.needsPasswordRehash()) {
        logger.info('Password needs rehashing for user', { email, userId: user.id });
        // Note: In a production system, you might want to rehash here
        // but that requires storing the plaintext password temporarily
        // For now, we'll just log it for monitoring
      }

      // Reset failed login attempts on successful login
      await user.resetLoginAttempts();

      // Create session with database tokens
      const sessionData = await SessionService.createSession(
        req, 
        user, 
        user.role,
        req.get('User-Agent'),
        req.ip
      );

      // Log successful login
      logger.info(`User logged in: ${email}`, {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        sessionId: sessionData.sessionId,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role.name,
            permissions: user.role.permissions,
            isEmailVerified: user.isEmailVerified,
          },
          sessionId: sessionData.sessionId,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/logout:
   *   post:
   *     tags: [Authentication]
   *     summary: Logout user and destroy session
   *     description: Logs out the current user and destroys their session. Requires authentication.
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LogoutResponse'
   *             examples:
   *               success:
   *                 summary: Successful logout
   *                 value:
   *                   success: true
   *                   message: Logout successful
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               notAuthenticated:
   *                 summary: Not authenticated
   *                 value:
   *                   success: false
   *                   message: Not authenticated
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionInfo = SessionService.getSessionInfo(req);
      
      // Revoke session in database
      const success = await SessionService.revokeSession(req);
      
      if (!success) {
        logger.error('Failed to revoke session during logout', {
          userId: sessionInfo?.userId,
          sessionId: sessionInfo?.sessionId,
        });
      }

      // Log logout
      if (sessionInfo) {
        logger.info(`User logged out: ${sessionInfo.email}`, {
          userId: sessionInfo.userId,
          sessionId: sessionInfo.sessionId,
        });
      }

      res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/profile:
   *   get:
   *     tags: [Authentication]
   *     summary: Get current user profile
   *     description: Retrieves the profile information of the currently authenticated user including role and permissions.
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProfileResponse'
   *             examples:
   *               success:
   *                 summary: User profile
   *                 value:
   *                   success: true
   *                   data:
   *                     user:
   *                       id: 1
   *                       email: user@example.com
   *                       firstName: John
   *                       lastName: Doe
   *                       phone: '+15551234567'
   *                       dateOfBirth: '1990-01-01'
   *                       isEmailVerified: true
   *                       isPhoneVerified: false
   *                       isActive: true
   *                       lastLoginAt: '2025-09-10T17:30:00.000Z'
   *                       createdAt: '2025-09-10T17:30:00.000Z'
   *                       updatedAt: '2025-09-10T17:30:00.000Z'
   *                       role:
   *                         id: 1
   *                         name: customer
   *                         displayName: Customer
   *                         permissions: ['products:read', 'orders:read']
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               notAuthenticated:
   *                 summary: Not authenticated
   *                 value:
   *                   success: false
   *                   message: Not authenticated
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = SessionService.getSession(req);
      if (!session) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      // Get fresh user data
      const user = await User.findByPk(session.userId, {
        include: [{ model: Role, as: 'role' }],
        attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] },
      }) as any; // Type assertion needed for included associations

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            role: user.role.name,
            permissions: user.role.permissions,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/refresh:
   *   post:
   *     tags: [Authentication]
   *     summary: Refresh user session
   *     description: Refreshes the current user's session and updates the last activity timestamp. Requires authentication.
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Session refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RefreshResponse'
   *             examples:
   *               success:
   *                 summary: Session refreshed
   *                 value:
   *                   success: true
   *                   message: Session refreshed successfully
   *                   data:
   *                     refreshToken: refresh_token_1234567890abcdef
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *             examples:
   *               notAuthenticated:
   *                 summary: Not authenticated
   *                 value:
   *                   success: false
   *                   message: Not authenticated
   *                   timestamp: '2025-09-10T17:30:00.000Z'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  static async refreshSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!SessionService.isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const newAccessToken = await SessionService.refreshAccessToken(req);
      
      if (!newAccessToken) {
        res.status(401).json({
          success: false,
          message: 'Failed to refresh token',
        });
        return;
      }

      SessionService.updateActivity(req);

      res.json({
        success: true,
        message: 'Session refreshed successfully',
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      logger.error('Refresh session error:', error);
      next(error);
    }
  }

  /**
   * Create default roles if they don't exist
   */
  private static async createDefaultRoles(): Promise<void> {
    try {
      for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        await Role.findOrCreate({
          where: { name: roleName },
          defaults: {
            name: roleName,
            description: `Default ${roleName.replace('_', ' ')} role`,
            permissions,
            isActive: true,
          },
        });
      }
      
      logger.info('Default roles created successfully');
    } catch (error) {
      logger.error('Error creating default roles:', error);
      throw error;
    }
  }

  /**
   * Get allowed roles for specific login types
   * Prevents cross-role access (e.g., customers can't login to admin area)
   */
  private static getAllowedRolesForLogin(expectedRole: string): string[] {
    switch (expectedRole.toLowerCase()) {
      case 'admin':
        return ['admin'];
      case 'employee':
        return ['admin', 'manager', 'designer', 'support', 'moderator'];
      case 'customer':
        return ['customer'];
      default:
        // If no expected role specified, allow all roles (backward compatibility)
        return ['admin', 'manager', 'designer', 'support', 'moderator', 'customer'];
    }
  }

  /**
   * @swagger
   * /api/v1/auth/google:
   *   post:
   *     tags: [Authentication]
   *     summary: Google OAuth login/registration
   *     description: Authenticate or register a user using Google OAuth. Links to existing account by email or creates new account.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - idToken
   *               - expectedRole
   *             properties:
   *               idToken:
   *                 type: string
   *                 description: Google ID token from client
   *               expectedRole:
   *                 type: string
   *                 enum: [admin, employee, customer]
   *                 description: Expected user role for access control
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       type: object
   *                     sessionId:
   *                       type: string
   *                     accessToken:
   *                       type: string
   *                     refreshToken:
   *                       type: string
   *       400:
   *         description: Invalid request or token
   *       403:
   *         description: Access denied for role
   *       500:
   *         description: Server error
   */
  public static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken, expectedRole = 'customer' } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID token is required'
        });
        return;
      }

      // Verify Google token
      const googleUserInfo = await OAuthService.verifyGoogleToken(idToken);
      if (!googleUserInfo) {
        res.status(400).json({
          success: false,
          message: 'Invalid Google token'
        });
        return;
      }

      // Handle Google login
      const result = await OAuthService.handleGoogleLogin(googleUserInfo, expectedRole);

      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.message.includes('Access denied') ? 403 : 400;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error('Google OAuth login error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/oauth/providers:
   *   get:
   *     tags: [Authentication]
   *     summary: Get user's linked OAuth providers
   *     description: Returns all OAuth providers linked to the authenticated user's account
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: OAuth providers retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                       provider:
   *                         type: string
   *                       email:
   *                         type: string
   *                       firstName:
   *                         type: string
   *                       lastName:
   *                         type: string
   *                       avatar:
   *                         type: string
   *                       lastUsedAt:
   *                         type: string
   *                         format: date-time
   *       401:
   *         description: Not authenticated
   *       500:
   *         description: Server error
   */
  public static async getOAuthProviders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      const providers = await OAuthService.getUserProviders(userId);

      res.status(200).json({
        success: true,
        data: providers.map(provider => ({
          id: provider.id,
          provider: provider.provider,
          email: provider.email,
          firstName: provider.firstName,
          lastName: provider.lastName,
          avatar: provider.avatar,
          lastUsedAt: provider.lastUsedAt
        }))
      });

    } catch (error) {
      logger.error('Get OAuth providers error:', error);
      next(error);
    }
  }

  /**
   * @swagger
   * /api/v1/auth/oauth/unlink:
   *   post:
   *     tags: [Authentication]
   *     summary: Unlink OAuth provider from user account
   *     description: Removes the specified OAuth provider from the user's account. Cannot unlink if it's the only login method.
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - provider
   *             properties:
   *               provider:
   *                 type: string
   *                 enum: [google, facebook, apple]
   *                 description: OAuth provider to unlink
   *     responses:
   *       200:
   *         description: OAuth provider unlinked successfully
   *       400:
   *         description: Invalid request or cannot unlink
   *       401:
   *         description: Not authenticated
   *       500:
   *         description: Server error
   */
  public static async unlinkOAuthProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { provider } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      if (!provider) {
        res.status(400).json({
          success: false,
          message: 'Provider is required'
        });
        return;
      }

      const result = await OAuthService.unlinkProvider(userId, provider);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Unlink OAuth provider error:', error);
      next(error);
    }
  }
}
