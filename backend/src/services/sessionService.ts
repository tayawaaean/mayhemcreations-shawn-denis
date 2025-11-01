import { Request, Response } from 'express';
import { Session, User, Role } from '../models';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Session interface
interface SessionData {
  userId: number;
  email: string;
  role: string;
  permissions: string[];
  loginTime: Date;
  lastActivity: Date;
  sessionId: string;
}

export class SessionService {
  /**
   * Check if user is authenticated
   */
  static isAuthenticated(req: Request): boolean {
    return !!(req.session && (req.session as any).user);
  }

  /**
   * Get session data
   */
  static getSession(req: Request): SessionData | null {
    return (req.session as any)?.user || null;
  }


  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Create new session
   */
  static async createSession(
    req: Request, 
    user: User, 
    role: Role, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<SessionData> {
    try {
      const sessionId = this.generateSessionId();

      // Calculate expiration time (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create session in database
      logger.info('Creating session in database', {
        sessionId,
        userId: user.id,
        userAgent,
        ipAddress,
      });
      
      const dbSession = await Session.create({
        sessionId,
        userId: user.id,
        userAgent,
        ipAddress,
        expiresAt,
        lastActivity: new Date(),
      });
      
      logger.info('Session created successfully in database', {
        sessionId: dbSession.sessionId,
        userId: dbSession.userId,
      });

      // Create session data for express-session
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        role: role.name,
        permissions: role.permissions,
        loginTime: new Date(),
        lastActivity: new Date(),
        sessionId,
      };

      // Store in express-session
      // CRITICAL: express-session only saves if the session is modified
      // Setting req.session.user marks the session as modified, so express-session will save it
      // The cookie will be set automatically when the response is sent
      if (req.session) {
        (req.session as any).user = sessionData;
        // Explicitly save the session to ensure cookie is set
        // This ensures the session is saved before the response is sent
        await new Promise<void>((resolve, reject) => {
          req.session!.save((err) => {
            if (err) {
              logger.error('Error saving session:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }

      logger.info(`Session created for user: ${user.email}`, {
        userId: user.id,
        sessionId,
        userAgent,
        ipAddress,
        sessionCookieSet: !!req.session,
      });

      return sessionData;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate session from database
   */
  static async validateSession(req: Request): Promise<SessionData | null> {
    try {
      const sessionData = this.getSession(req);
      if (!sessionData) return null;

      // Find session in database
      const dbSession = await Session.findOne({
        where: {
          sessionId: sessionData.sessionId,
          isActive: true,
        },
        include: [
          {
            model: User,
            as: 'user',
            include: [{ model: Role, as: 'role' }],
          },
        ],
      });

      if (!dbSession || !dbSession.isActiveSession()) {
        logger.warn('Invalid or expired session', {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
        });
        return null;
      }

      // Check if session was revoked (isActive: false)
      if (!dbSession.isActive) {
        logger.warn('Session was revoked', {
          sessionId: sessionData.sessionId,
          userId: sessionData.userId,
        });
        // Set a special flag to indicate session was revoked
        (req as any).sessionRevoked = true;
        return null;
      }


      // Update last activity
      await dbSession.updateActivity();

      // Update session data with fresh data
      const updatedSessionData: SessionData = {
        ...sessionData,
        lastActivity: new Date(),
        permissions: (dbSession as any).user.role.permissions,
      };

      if (req.session) {
        (req.session as any).user = updatedSessionData;
      }

      return updatedSessionData;
    } catch (error) {
      logger.error('Error validating session:', error);
      return null;
    }
  }


  /**
   * Revoke session (logout)
   */
  static async revokeSession(req: Request): Promise<boolean> {
    try {
      const sessionData = this.getSession(req);
      if (!sessionData) return true;

      // Find and revoke session in database
      const dbSession = await Session.findOne({
        where: {
          sessionId: sessionData.sessionId,
        },
      });

      if (dbSession) {
        await dbSession.revoke();
        logger.info('Session revoked', {
          userId: sessionData.userId,
          sessionId: sessionData.sessionId,
        });
      }

      // Destroy express session
      this.destroySession(req);

      return true;
    } catch (error) {
      logger.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: number): Promise<boolean> {
    try {
      await Session.update(
        { isActive: false },
        {
          where: {
            userId,
            isActive: true,
          },
        }
      );

      logger.info('All sessions revoked for user', { userId });
      return true;
    } catch (error) {
      logger.error('Error revoking all user sessions:', error);
      return false;
    }
  }

  /**
   * Set session data
   */
  static setSession(req: Request, userData: SessionData): void {
    if (req.session) {
      (req.session as any).user = userData;
    }
  }

  /**
   * Update session activity
   */
  static updateActivity(req: Request): void {
    const session = this.getSession(req);
    if (session) {
      session.lastActivity = new Date();
      this.setSession(req, session);
    }
  }

  /**
   * Destroy session
   */
  static destroySession(req: Request, callback?: (err?: any) => void): void {
    if (req.session) {
      req.session.destroy(callback || (() => {}));
    } else if (callback) {
      callback();
    }
  }

  /**
   * Get session info for logging
   */
  static getSessionInfo(req: Request): { userId?: number; email?: string; role?: string; sessionId?: string } {
    const session = this.getSession(req);
    return {
      userId: session?.userId,
      email: session?.email,
      role: session?.role,
      sessionId: session?.sessionId,
    };
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(req: Request): boolean {
    const session = this.getSession(req);
    if (!session) return true;

    const now = new Date();
    const lastActivity = new Date(session.lastActivity);
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    return (now.getTime() - lastActivity.getTime()) > sessionTimeout;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(req: Request, roleName: string): boolean {
    const session = this.getSession(req);
    return session?.role === roleName;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(req: Request, roleNames: string[]): boolean {
    const session = this.getSession(req);
    return session ? roleNames.includes(session.role) : false;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(req: Request, permission: string): boolean {
    const session = this.getSession(req);
    return session?.permissions?.includes(permission) || false;
  }

  /**
   * Get user role
   */
  static getUserRole(req: Request): string | null {
    const session = this.getSession(req);
    return session?.role || null;
  }

  /**
   * Get user permissions
   */
  static getUserPermissions(req: Request): string[] {
    const session = this.getSession(req);
    return session?.permissions || [];
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await Session.update(
        { isActive: false },
        {
          where: {
            isActive: true,
            expiresAt: {
              [require('sequelize').Op.lt]: new Date(),
            },
          },
        }
      );

      const cleanedCount = result[0];
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Create session for seeder operations (bypasses express-session)
   */
  static async createSeederSession(
    userId: number,
    req: any,
    userAgent?: string
  ): Promise<{ sessionId: string } | null> {
    try {
      const sessionId = this.generateSessionId();

      // Calculate expiration time (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create session in database
      const dbSession = await Session.create({
        sessionId,
        userId,
        userAgent: userAgent || 'SeederService/1.0',
        ipAddress: req.ip || '127.0.0.1',
        expiresAt,
        lastActivity: new Date(),
      });

      logger.info('Seeder session created', {
        sessionId: dbSession.sessionId,
        userId: dbSession.userId,
      });

      return {
        sessionId: dbSession.sessionId,
      };
    } catch (error) {
      logger.error('Error creating seeder session:', error);
      return null;
    }
  }

  /**
   * Destroy session by session ID
   */
  static async destroySessionBySessionId(sessionId: string): Promise<boolean> {
    try {
      const result = await Session.update(
        { isActive: false },
        {
          where: {
            sessionId,
            isActive: true,
          },
        }
      );

      const destroyedCount = result[0];
      if (destroyedCount > 0) {
        logger.info('Session destroyed by session ID', { sessionId });
      }

      return destroyedCount > 0;
    } catch (error) {
      logger.error('Error destroying session by session ID:', error);
      return false;
    }
  }
}