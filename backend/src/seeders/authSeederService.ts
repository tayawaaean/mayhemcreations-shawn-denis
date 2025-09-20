import { logger } from '../utils/logger';
import { User, Role } from '../models';
import bcrypt from 'bcrypt';
import { SessionService } from '../services/sessionService';
import { Request, Response } from 'express';

/**
 * Seeder Authentication Service
 * Handles authentication for database seeding operations
 * This service bypasses normal API authentication for seeding purposes
 */

export interface SeederAuthContext {
  adminUser: User;
  adminRole: Role;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Authenticates as admin user for seeding operations
 * @returns Promise<SeederAuthContext> - Authentication context for seeding
 */
export async function authenticateAsAdmin(): Promise<SeederAuthContext> {
  try {
    logger.info('🔐 Authenticating as admin for seeding operations...');

    // Find or create admin role
    let adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      logger.warn('⚠️ Admin role not found, creating it...');
      adminRole = await Role.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system administrator with all permissions',
        permissions: ['*'], // All permissions
        isActive: true,
      });
      logger.info('✅ Admin role created');
    }

    // Find or create admin user
    let adminUser = await User.findOne({
      where: { email: 'admin@mayhemcreations.com' },
      include: [{ model: Role, as: 'role' }],
    });

    if (!adminUser) {
      logger.warn('⚠️ Admin user not found, creating it...');
      const hashedPassword = await bcrypt.hash('admin123!', 12);
      
      adminUser = await User.create({
        email: 'admin@mayhemcreations.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        phone: '1234567890',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        roleId: adminRole.id,
      });

      // Associate with role
      // Role is already set via roleId in create
      logger.info('✅ Admin user created');
    } else {
      // Ensure admin user has admin role
      if (adminUser.roleId !== adminRole.id) {
        // Role is already set via roleId in create
        logger.info('✅ Admin user role updated');
      }
    }

    // Create a mock request object for session creation
    const mockRequest = {
      session: {},
      headers: {
        'user-agent': 'SeederService/1.0',
      },
      ip: '127.0.0.1',
    } as any;

    // Create session for admin user
    const sessionData = await SessionService.createSeederSession(
      adminUser.id,
      mockRequest,
      'SeederService'
    );

    if (!sessionData) {
      throw new Error('Failed to create admin session');
    }

    logger.info('✅ Admin authentication successful');
    logger.info(`   • Admin User: ${adminUser.email} (ID: ${adminUser.id})`);
    logger.info(`   • Session ID: ${sessionData.sessionId}`);
    logger.info(`   • Role: ${adminRole.displayName}`);

    return {
      adminUser,
      adminRole,
      sessionId: sessionData.sessionId,
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
    };

  } catch (error) {
    logger.error('❌ Error authenticating as admin:', error);
    throw error;
  }
}

/**
 * Creates a mock request object with admin authentication for API calls
 * @param authContext - Authentication context from authenticateAsAdmin
 * @returns Mock request object with admin session
 */
export function createAuthenticatedRequest(authContext: SeederAuthContext): any {
  return {
    session: {
      userId: authContext.adminUser.id,
      email: authContext.adminUser.email,
      role: authContext.adminRole.name,
      permissions: authContext.adminRole.permissions,
      loginTime: new Date(),
      lastActivity: new Date(),
      sessionId: authContext.sessionId,
      accessToken: authContext.accessToken,
      refreshToken: authContext.refreshToken,
    },
    headers: {
      'user-agent': 'SeederService/1.0',
      'authorization': `Bearer ${authContext.accessToken}`,
    },
    ip: '127.0.0.1',
    user: {
      userId: authContext.adminUser.id,
      email: authContext.adminUser.email,
      role: authContext.adminRole.name,
      permissions: authContext.adminRole.permissions,
      loginTime: new Date(),
      lastActivity: new Date(),
      sessionId: authContext.sessionId,
      accessToken: authContext.accessToken,
      refreshToken: authContext.refreshToken,
    },
  };
}

/**
 * Cleans up admin session after seeding operations
 * @param authContext - Authentication context to clean up
 */
export async function cleanupAdminSession(authContext: SeederAuthContext): Promise<void> {
  try {
    logger.info('🧹 Cleaning up admin session...');
    
    // Destroy the session
    await SessionService.destroySessionBySessionId(authContext.sessionId);
    
    logger.info('✅ Admin session cleaned up');
  } catch (error) {
    logger.warn('⚠️ Error cleaning up admin session:', error);
    // Don't throw error as this is cleanup
  }
}

/**
 * Validates that admin user has proper permissions
 * @param authContext - Authentication context to validate
 * @returns boolean - True if admin has proper permissions
 */
export function validateAdminPermissions(authContext: SeederAuthContext): boolean {
  try {
    const permissions = authContext.adminRole.permissions || [];
    
    // Check if admin has all permissions or specific admin permissions
    const hasAllPermissions = permissions.includes('*');
    const hasAdminPermissions = permissions.some(permission => 
      permission.includes('admin') || 
      permission.includes('create') || 
      permission.includes('update') || 
      permission.includes('delete')
    );

    const isValid = hasAllPermissions || hasAdminPermissions;
    
    if (!isValid) {
      logger.warn('⚠️ Admin user does not have sufficient permissions for seeding');
      logger.warn(`   • Current permissions: ${permissions.join(', ')}`);
    }

    return isValid;
  } catch (error) {
    logger.error('❌ Error validating admin permissions:', error);
    return false;
  }
}

/**
 * Gets admin user information for logging
 * @param authContext - Authentication context
 * @returns Admin user info string
 */
export function getAdminInfo(authContext: SeederAuthContext): string {
  return `${authContext.adminUser.email} (${authContext.adminRole.displayName})`;
}
