import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';
import { logger } from '../utils/logger';
import { Session, User, Role } from '../models';

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!SessionService.isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Update session activity
    SessionService.updateActivity(req);
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

// Session-based authentication middleware for all user types
export const sessionAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (SessionService.isAuthenticated(req)) {
      const sessionData = SessionService.getSession(req);
      if (sessionData) {
        // Set user data in request object for controllers
        (req as any).user = {
          id: sessionData.userId,
          email: sessionData.email,
          role: sessionData.role,
          permissions: sessionData.permissions
        };
        
        // Ensure session data is properly set for SessionService checks
        if (req.session) {
          (req.session as any).user = sessionData;
        }
      }
      SessionService.updateActivity(req);
      next();
      return;
    }

    // Check if session was revoked
    if ((req as any).sessionRevoked) {
      logger.warn('🔐 SessionAuth: Session was revoked', {
        hasSession: !!req.session,
        url: req.url,
        method: req.method
      });

      res.status(401).json({
        success: false,
        message: 'Your session has been revoked. Please log in again.',
        code: 'SESSION_REVOKED',
      });
      return;
    }

    // No valid session found
    logger.warn('🔐 SessionAuth: No valid session found', {
      hasSession: !!req.session,
      url: req.url,
      method: req.method
    });

    res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  } catch (error) {
    logger.error('Session authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

// Authorization middleware - check specific permission
export const authorize = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!SessionService.isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!SessionService.hasPermission(req, permission)) {
        logger.warn(`Access denied for permission: ${permission}`, {
          userId: SessionService.getSession(req)?.userId,
          permission,
        });
        
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
        });
        return;
      }

      SessionService.updateActivity(req);
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

// Role-based authorization middleware
export const requireRole = (roleNames: string | string[]) => {
  const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!SessionService.isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const session = SessionService.getSession(req);
      logger.info('🔐 Role check debug:', {
        userId: session?.userId,
        userRole: session?.role,
        requiredRoles: roles,
        hasAnyRole: SessionService.hasAnyRole(req, roles),
        sessionData: session,
        sessionRoleType: typeof session?.role,
        sessionRoleValue: session?.role
      });

      if (!SessionService.hasAnyRole(req, roles)) {
        logger.warn(`Access denied for roles: ${roles.join(', ')}`, {
          userId: session?.userId,
          requiredRoles: roles,
          userRole: session?.role,
          hasAnyRole: SessionService.hasAnyRole(req, roles),
        });
        
        res.status(403).json({
          success: false,
          message: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: roles,
          userRole: session?.role,
        });
        return;
      }

      SessionService.updateActivity(req);
      next();
    } catch (error) {
      logger.error('Role authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

// Multiple roles authorization middleware
export const requireAnyRole = (roleNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!SessionService.isAuthenticated(req)) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!SessionService.hasAnyRole(req, roleNames)) {
        logger.warn(`Access denied for roles: ${roleNames.join(', ')}`, {
          userId: SessionService.getSession(req)?.userId,
          requiredRoles: roleNames,
          userRole: SessionService.getSession(req)?.role,
        });
        
        res.status(403).json({
          success: false,
          message: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: roleNames,
        });
        return;
      }

      SessionService.updateActivity(req);
      next();
    } catch (error) {
      logger.error('Multi-role authorization middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

// Admin-only middleware
export const requireAdmin = requireRole('admin');

// Super admin-only middleware
export const requireSuperAdmin = requireRole('super_admin');

// Optional authentication middleware (doesn't fail if not authenticated)
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (SessionService.isAuthenticated(req)) {
      SessionService.updateActivity(req);
    }
    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Session validation middleware - works with both session and Bearer token auth
export const validateSession = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check if user is authenticated (either via session or Bearer token)
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'No valid session found',
        code: 'INVALID_SESSION',
      });
      return;
    }

    // Only check session expiration if we have session data
    if (SessionService.isAuthenticated(req)) {
      // Check if session is expired
      if (SessionService.isSessionExpired(req)) {
        SessionService.destroySession(req);
        res.status(401).json({
          success: false,
          message: 'Session expired',
          code: 'SESSION_EXPIRED',
        });
        return;
      }

      SessionService.updateActivity(req);
    }
    
    next();
  } catch (error) {
    logger.error('Session validation middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Session validation error',
    });
  }
};
