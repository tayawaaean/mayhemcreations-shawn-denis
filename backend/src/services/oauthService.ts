import { OAuth2Client } from 'google-auth-library';
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
    accessToken: string;
    refreshToken: string;
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

      return {
        id: payload.sub,
        email: payload.email || '',
        verified_email: payload.email_verified || false,
        name: payload.name || '',
        given_name: payload.given_name || '',
        family_name: payload.family_name || '',
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
   */
  static async handleGoogleLogin(googleUserInfo: GoogleUserInfo, expectedRole: string = 'customer'): Promise<OAuthLoginResult> {
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
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider: 'google',
            providerId: googleUserInfo.id,
            email: googleUserInfo.email,
            firstName: googleUserInfo.given_name,
            lastName: googleUserInfo.family_name,
            avatar: googleUserInfo.picture,
            isActive: true
          });

          // Update user login method if needed
          if (user.loginMethod === 'password') {
            user.loginMethod = 'both';
            await user.save();
          }
        } else {
          // Create new user and OAuth provider
          const { user: newUser, isNewUser: newUserFlag } = await User.findOrCreateForOAuth({
            email: googleUserInfo.email,
            firstName: googleUserInfo.given_name,
            lastName: googleUserInfo.family_name,
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
            firstName: googleUserInfo.given_name,
            lastName: googleUserInfo.family_name,
            avatar: googleUserInfo.picture,
            isActive: true
          });
        }
      }

      // Validate role access
      const allowedRoles = this.getAllowedRolesForLogin(expectedRole);
      if (!allowedRoles.includes((user as any).role.name)) {
        return {
          success: false,
          message: `Access denied. This account (${(user as any).role.name}) cannot access ${expectedRole} area.`
        };
      }

      // Create session
      const sessionResult = await SessionService.createSession(
        {} as any, // Mock request object
        user,
        (user as any).role,
        'Google OAuth',
        '127.0.0.1' // This should come from request in real implementation
      );

      // Update user last login
      await user.update({ lastLoginAt: new Date() });

      logger.info(`Google OAuth login successful: ${user.email} (${isNewUser ? 'new user' : 'existing user'})`);

      return {
        success: true,
        message: isNewUser ? 'Account created and logged in successfully' : 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: (user as any).role.name,
            permissions: (user as any).role.permissions,
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          },
          sessionId: sessionResult.sessionId,
          accessToken: sessionResult.accessToken,
          refreshToken: sessionResult.refreshToken
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
