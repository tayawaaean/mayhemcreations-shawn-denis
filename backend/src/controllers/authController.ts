import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { User, Role, ROLES, DEFAULT_ROLE_PERMISSIONS } from '../models';
import { SessionService } from '../services/sessionService';
import { logger } from '../utils/logger';

// Session types are now defined in types/session.d.ts

// Auth controller class
export class AuthController {
  /**
   * Register a new user
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

      // Log registration
      logger.info(`New user registered: ${email}`, {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  /**
   * Login user
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

      const { email, password } = req.body;

      // Find user with role
      const user = await User.findOne({
        where: { email },
        include: [{ model: Role, as: 'role' }],
      }) as any; // Type assertion needed for included associations

      if (!user) {
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

      // Verify password
      const isPasswordValid = await user.checkPassword(password);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incLoginAttempts();
        
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Reset failed login attempts on successful login
      await user.resetLoginAttempts();

      // Create session
      SessionService.createSession(req, user, user.role);

      // Log successful login
      logger.info(`User logged in: ${email}`, {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        sessionId: req.sessionID,
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
          sessionId: req.sessionID,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionInfo = SessionService.getSessionInfo(req);
      
      // Destroy session
      SessionService.destroySession(req, (err) => {
        if (err) {
          logger.error('Logout error:', err);
          res.status(500).json({
            success: false,
            message: 'Error during logout',
          });
          return;
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
        });
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  /**
   * Get current user profile
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
   * Refresh session
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

      const newRefreshToken = SessionService.refreshSession(req);
      SessionService.updateActivity(req);

      res.json({
        success: true,
        message: 'Session refreshed successfully',
        data: {
          refreshToken: newRefreshToken,
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
}
