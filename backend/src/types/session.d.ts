// Extend the express-session SessionData interface
declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: number;
      email: string;
      roleId: number;
      roleName: string;
      permissions: string[];
      loginTime: Date;
      lastActivity: Date;
      refreshToken?: string;
    };
    refreshToken?: string;
  }
}
