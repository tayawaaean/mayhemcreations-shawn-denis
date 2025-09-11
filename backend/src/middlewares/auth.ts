import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';
import { logger } from '../utils/logger';

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

      if (!SessionService.hasAnyRole(req, roles)) {
        logger.warn(`Access denied for roles: ${roles.join(', ')}`, {
          userId: SessionService.getSession(req)?.userId,
          requiredRoles: roles,
          userRole: SessionService.getSession(req)?.role,
        });
        
        res.status(403).json({
          success: false,
          message: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: roles,
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

// Session validation middleware
export const validateSession = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!SessionService.isAuthenticated(req)) {
      res.status(401).json({
        success: false,
        message: 'No valid session found',
        code: 'INVALID_SESSION',
      });
      return;
    }

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
    next();
  } catch (error) {
    logger.error('Session validation middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Session validation error',
    });
  }
};
