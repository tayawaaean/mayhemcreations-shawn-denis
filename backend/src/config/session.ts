const session = require('express-session');

// Session store configuration
// Use memory store for both development and production for now
let sessionStore: any;

// Development: Use memory store
const MemoryStore = require('memorystore')(session);
sessionStore = new MemoryStore({
  checkPeriod: 86400000, // prune expired entries every 24h
});

// Session configuration
const sessionConfig = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: true, // Changed to true to ensure sessions are saved even during DB operations
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset expiration on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 86400000, // 24 hours in milliseconds
    sameSite: 'lax' as const, // Allow cross-origin requests for development
  },
  name: 'mayhem.sid', // Custom session cookie name
});

export { sessionConfig, sessionStore };
