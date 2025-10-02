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

// Hybrid authentication middleware - supports both session-based and token-based auth
export const hybridAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First try session-based authentication
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

    // If no session, try token-based authentication
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      logger.info('🔐 HybridAuth: Attempting Bearer token authentication', { 
        tokenPrefix: token.substring(0, 10) + '...',
        url: req.url 
      });
      
      try {
        // Find session by access token
        const session = await Session.findOne({
          where: { accessToken: token },
          include: [
            { model: User, as: 'user', include: [{ model: Role, as: 'role' }] }
          ]
        }) as any; // Type assertion for association

        logger.info('🔐 HybridAuth: Session lookup result', { 
          found: !!session,
          hasUser: !!(session && session.user),
          sessionId: session?.sessionId,
          userId: session?.user?.id
        });

        if (session && session.user) {
          // Check if session is expired
          const now = new Date();
          if (session.expiresAt && session.expiresAt < now) {
            res.status(401).json({
              success: false,
              message: 'Token expired',
              code: 'TOKEN_EXPIRED',
            });
            return;
          }

          // Attach user info to request for compatibility
          (req as any).user = {
            id: session.user.id, // Use 'id' for compatibility with existing code
            userId: session.user.id, // Keep both for backward compatibility
            email: session.user.email,
            role: session.user.role?.name || 'customer',
            permissions: session.user.role?.permissions || [],
            loginTime: session.createdAt,
            lastActivity: session.updatedAt,
            sessionId: session.sessionId, // Use sessionId string, not id number
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          };

          // Set session data for SessionService compatibility
          if (req.session) {
            (req.session as any).user = {
              userId: session.user.id,
              email: session.user.email,
              role: session.user.role?.name || 'customer',
              permissions: session.user.role?.permissions || [],
              sessionId: session.sessionId,
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              loginTime: session.createdAt,
              lastActivity: now,
            };
          }

          // Update session activity
          await session.update({ 
            lastActivity: now,
            updatedAt: now 
          });

          next();
          return;
        }
      } catch (tokenError) {
        logger.warn('Token validation error:', tokenError);
      }
    }

    // If neither session nor token authentication worked
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  } catch (error) {
    logger.error('Hybrid authentication middleware error:', error);
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
