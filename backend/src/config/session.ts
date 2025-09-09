import session from 'express-session';

// Session store configuration
// Use memory store for development, MariaDB for production
let sessionStore: any;

if (process.env.NODE_ENV === 'production') {
  // Production: Use MariaDB session store
  const MySQLStore = require('express-mysql-session');
  sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mayhem_creations',
    createDatabaseTable: true, // Create sessions table if it doesn't exist
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data',
      },
    },
    checkExpirationInterval: 900000, // Check for expired sessions every 15 minutes
    expiration: 86400000, // Session expires after 24 hours (in milliseconds)
    clearExpired: true, // Automatically clear expired sessions
  });
} else {
  // Development: Use memory store
  const MemoryStore = require('memorystore')(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
}

// Session configuration
const sessionConfig = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset expiration on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 86400000, // 24 hours in milliseconds
    sameSite: 'strict' as const, // CSRF protection
  },
  name: 'mayhem.sid', // Custom session cookie name
});

export { sessionConfig, sessionStore };
