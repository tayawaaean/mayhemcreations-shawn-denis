import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { User, OAuthProvider } from '../models';
import { SessionService } from './sessionService';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Initialize Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface OAuthLoginResult {
  success: boolean;
  message: string;
  data?: {
    user: any;
    sessionId: string;
  };
}

export class OAuthService {
  /**
   * Verify Google OAuth token and extract user information
   */
  static async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        logger.warn('Google OAuth: Invalid token payload');
        return null;
      }

      // Helper function to extract lastName from full name if family_name is missing
      const extractLastName = (name: string, givenName: string): string => {
        if (!name || !givenName) return 'User'; // Default fallback
        
        // Try to extract last name from full name
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length > 1) {
          // Remove the first name (given_name) and join the rest as last name
          const givenNameParts = givenName.trim().split(/\s+/);
          const lastNameParts = nameParts.slice(givenNameParts.length);
          if (lastNameParts.length > 0) {
            return lastNameParts.join(' ');
          }
        }
        return 'User'; // Default fallback if extraction fails
      };

      const givenName = payload.given_name || '';
      const familyName = payload.family_name || '';
      const fullName = payload.name || '';
      
      // Ensure firstName is valid (at least 2 chars) - use full name or default if given_name is missing/short
      let firstName = givenName;
      if (!firstName || firstName.length < 2) {
        if (fullName) {
          // Try to extract first name from full name
          const nameParts = fullName.trim().split(/\s+/);
          firstName = nameParts[0] || 'User';
        } else {
          firstName = 'User';
        }
      }
      
      // Use family_name if available, otherwise try to extract from full name, otherwise use default
      const lastName = (familyName && familyName.length >= 2) 
        ? familyName 
        : (fullName ? extractLastName(fullName, firstName) : 'User');

      return {
        id: payload.sub,
        email: payload.email || '',
        verified_email: payload.email_verified || false,
        name: fullName,
        given_name: firstName, // Use processed firstName (with fallback)
        family_name: lastName, // Use extracted/fallback lastName
        picture: payload.picture || '',
        locale: payload.locale || 'en',
      };
    } catch (error) {
      logger.error('Google OAuth verification failed:', error);
      return null;
    }
  }

  /**
   * Handle Google OAuth login/registration
   * @param googleUserInfo - Google user information from token verification
   * @param expectedRole - Expected user role ('customer' or 'employee')
   * @param req - Express request object (required for session cookie setting)
   * @param res - Express response object (optional, for session cookie setting)
   */
  static async handleGoogleLogin(
    googleUserInfo: GoogleUserInfo, 
    expectedRole: string = 'customer',
    req?: Request,
    res?: Response
  ): Promise<OAuthLoginResult> {
    try {
      // Validate email verification
      if (!googleUserInfo.verified_email) {
        return {
          success: false,
          message: 'Google account email is not verified'
        };
      }

      // Get customer role ID
      const { Role } = await import('../models');
      const customerRole = await Role.findOne({ where: { name: expectedRole } });
      if (!customerRole) {
        return {
          success: false,
          message: 'Invalid role specified'
        };
      }

      // Check if OAuth provider already exists
      let oauthProvider = await OAuthProvider.findByProviderAndId('google', googleUserInfo.id);

      let user: User;
      let isNewUser = false;

      if (oauthProvider) {
        // OAuth provider exists, get the user
        const foundUser = await User.findByPk(oauthProvider.userId, {
          include: [{ model: Role, as: 'role' }]
        });

        if (!foundUser) {
          return {
            success: false,
            message: 'OAuth provider linked to non-existent user'
          };
        }

        user = foundUser;

        // Update last used timestamp
        await oauthProvider.updateLastUsed();
      } else {
        // Check if user exists by email
        const existingUser = await User.findOne({
          where: { email: googleUserInfo.email },
          include: [{ model: Role, as: 'role' }]
        });

        if (existingUser) {
          user = existingUser;
          // User exists, link OAuth provider
          // Ensure lastName is valid (not empty, at least 2 chars) for OAuth provider record
          const validLastName = googleUserInfo.family_name && googleUserInfo.family_name.length >= 2 
            ? googleUserInfo.family_name 
            : 'User';
          
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider: 'google',
            providerId: googleUserInfo.id,
            email: googleUserInfo.email,
            firstName: googleUserInfo.given_name || 'User',
            lastName: validLastName,
            avatar: googleUserInfo.picture,
            isActive: true
          });

          // Update user login method if needed
          if (user.loginMethod === 'password') {
            user.loginMethod = 'both';
            await user.save();
          }
        } else {
          // Ensure firstName and lastName are valid (not empty, at least 2 chars) for user creation
          const validFirstName = googleUserInfo.given_name && googleUserInfo.given_name.length >= 2 
            ? googleUserInfo.given_name 
            : 'User';
          const validLastName = googleUserInfo.family_name && googleUserInfo.family_name.length >= 2 
            ? googleUserInfo.family_name 
            : 'User';

          // Create new user and OAuth provider
          const { user: newUser, isNewUser: newUserFlag } = await User.findOrCreateForOAuth({
            email: googleUserInfo.email,
            firstName: validFirstName,
            lastName: validLastName,
            avatar: googleUserInfo.picture,
            provider: 'google',
            providerId: googleUserInfo.id
          }, customerRole.id);

          user = newUser;
          isNewUser = newUserFlag;

          // Create OAuth provider record
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider: 'google',
            providerId: googleUserInfo.id,
            email: googleUserInfo.email,
            firstName: validFirstName,
            lastName: validLastName,
            avatar: googleUserInfo.picture,
            isActive: true
          });
        }
      }

      // Ensure role is loaded before validation
      if (!(user as any).role) {
        const { Role } = await import('../models');
        user = await User.findByPk(user.id, {
          include: [{ model: Role, as: 'role' }]
        }) as User;
        
        if (!(user as any).role) {
          logger.error('Google OAuth: User role not found after reload', {
            userId: user.id,
            roleId: user.roleId
          });
          return {
            success: false,
            message: 'User role not found'
          };
        }
      }

      // Validate role access
      const allowedRoles = this.getAllowedRolesForLogin(expectedRole);
      const userRoleName = (user as any).role?.name;
      if (!userRoleName || !allowedRoles.includes(userRoleName)) {
        return {
          success: false,
          message: `Access denied. This account (${userRoleName || 'unknown role'}) cannot access ${expectedRole} area.`
        };
      }

      // Create session - CRITICAL: Must use real req object for express-session to set cookie
      // Without the real req object, express-session can't set the session cookie
      if (!req) {
        return {
          success: false,
          message: 'Request object required for session creation'
        };
      }

      const sessionResult = await SessionService.createSession(
        req, // Real request object - required for express-session cookie setting
        user,
        (user as any).role,
        'Google OAuth',
        req.ip || '127.0.0.1'
      );

      // Update user last login
      await user.update({ lastLoginAt: new Date() });

      logger.info(`Google OAuth login successful: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`);

      // Ensure role is available before accessing properties
      const userRole = (user as any).role;
      if (!userRole) {
        logger.error('Google OAuth: User role is missing in response', {
          userId: user.id
        });
        return {
          success: false,
          message: 'User role information is missing'
        };
      }

      return {
        success: true,
        message: isNewUser ? 'Account created and logged in successfully' : 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: userRole.name,
            permissions: userRole.permissions || [],
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          },
          sessionId: sessionResult.sessionId
        }
      };

    } catch (error) {
      logger.error('Google OAuth login error:', error);
      return {
        success: false,
        message: 'An error occurred during Google login'
      };
    }
  }

  /**
   * Get allowed roles for login (same as authController)
   */
  static getAllowedRolesForLogin(expectedRole: string): string[] {
    switch (expectedRole) {
      case 'admin':
        return ['admin'];
      case 'employee':
        return ['admin', 'manager', 'designer', 'support', 'moderator'];
      case 'customer':
        return ['customer'];
      default:
        return ['admin', 'manager', 'designer', 'support', 'moderator', 'customer'];
    }
  }

  /**
   * Unlink OAuth provider from user account
   */
  static async unlinkProvider(userId: number, provider: string): Promise<{ success: boolean; message: string }> {
    try {
      const oauthProvider = await OAuthProvider.findOne({
        where: { userId, provider, isActive: true }
      });

      if (!oauthProvider) {
        return {
          success: false,
          message: 'OAuth provider not found'
        };
      }

      // Check if user has other login methods
      const user = await User.findByPk(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // If this is the only login method, prevent unlinking
      if (user.loginMethod === 'oauth') {
        return {
          success: false,
          message: 'Cannot unlink the only login method. Please add a password first.'
        };
      }

      // Deactivate the OAuth provider
      await oauthProvider.deactivate();

      // Update user login method if needed
      if (user.loginMethod === 'both') {
        const remainingProviders = await OAuthProvider.count({
          where: { userId, isActive: true }
        });

        if (remainingProviders === 0) {
          user.loginMethod = 'password';
          await user.save();
        }
      }

      logger.info(`OAuth provider ${provider} unlinked from user ${userId}`);

      return {
        success: true,
        message: 'OAuth provider unlinked successfully'
      };

    } catch (error) {
      logger.error('Error unlinking OAuth provider:', error);
      return {
        success: false,
        message: 'An error occurred while unlinking OAuth provider'
      };
    }
  }

  /**
   * Get user's linked OAuth providers
   */
  static async getUserProviders(userId: number): Promise<OAuthProvider[]> {
    return await OAuthProvider.findByUserId(userId);
  }
}

export default OAuthService;
