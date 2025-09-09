import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';

// Session data interface
export interface SessionData {
  userId: number;
  email: string;
  roleId: number;
  roleName: string;
  permissions: string[];
  loginTime: Date;
  lastActivity: Date;
  refreshToken?: string;
}

// Session service class for managing MariaDB sessions
export class SessionService {
  /**
   * Create a new session for authenticated user
   */
  static createSession(req: Request, user: User, role: any): void {
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      roleId: role.id,
      roleName: role.name,
      permissions: role.permissions || [],
      loginTime: new Date(),
      lastActivity: new Date(),
    };

    // Store user data in session (using type assertion)
    (req.session as any).user = sessionData;
    
    // Generate refresh token and store in session
    const refreshToken = this.generateRefreshToken();
    (req.session as any).refreshToken = refreshToken;
    sessionData.refreshToken = refreshToken;

    // Update last login time
    user.update({ lastLoginAt: new Date() }).catch(console.error);
  }

  /**
   * Get current session data
   */
  static getSession(req: Request): SessionData | null {
    return (req.session as any).user || null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(req: Request): boolean {
    return !!(req.session && (req.session as any).user);
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(req: Request, permission: string): boolean {
    const session = this.getSession(req);
    if (!session) return false;
    
    return session.permissions.includes(permission) || 
           session.permissions.includes('*'); // Super admin has all permissions
  }

  /**
   * Check if user has specific role
   */
  static hasRole(req: Request, roleName: string): boolean {
    const session = this.getSession(req);
    if (!session) return false;
    
    return session.roleName === roleName;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(req: Request, roleNames: string[]): boolean {
    const session = this.getSession(req);
    if (!session) return false;
    
    return roleNames.includes(session.roleName);
  }

  /**
   * Update session activity timestamp
   */
  static updateActivity(req: Request): void {
    if ((req.session as any).user) {
      (req.session as any).user.lastActivity = new Date();
    }
  }

  /**
   * Refresh session (generate new refresh token)
   */
  static refreshSession(req: Request): string | null {
    if (!this.isAuthenticated(req)) {
      return null;
    }

    const newRefreshToken = this.generateRefreshToken();
    (req.session as any).refreshToken = newRefreshToken;
    
    if ((req.session as any).user) {
      (req.session as any).user.refreshToken = newRefreshToken;
    }

    return newRefreshToken;
  }

  /**
   * Destroy current session
   */
  static destroySession(req: Request, callback?: (err?: any) => void): void {
    req.session.destroy((err) => {
      if (callback) {
        callback(err);
      }
    });
  }

  /**
   * Regenerate session ID (for security)
   */
  static regenerateSession(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Generate a secure refresh token
   */
  private static generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate refresh token
   */
  static validateRefreshToken(req: Request, token: string): boolean {
    return (req.session as any).refreshToken === token;
  }

  /**
   * Get session info for debugging/monitoring
   */
  static getSessionInfo(req: Request): any {
    if (!this.isAuthenticated(req)) {
      return null;
    }

    const session = this.getSession(req);
    return {
      userId: session?.userId,
      email: session?.email,
      role: session?.roleName,
      loginTime: session?.loginTime,
      lastActivity: session?.lastActivity,
      sessionId: req.sessionID,
    };
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(req: Request): boolean {
    if (!req.session.cookie || !req.session.cookie.expires) return true;
    
    const now = new Date();
    const expires = new Date(req.session.cookie.expires);
    
    return now > expires;
  }

  /**
   * Extend session expiration
   */
  static extendSession(req: Request, maxAge: number = 24 * 60 * 60 * 1000): void {
    if (req.session.cookie) {
      req.session.cookie.maxAge = maxAge;
    }
  }
}
