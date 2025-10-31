const session = require('express-session');

// Session store configuration
// MemoryStore is the default (suitable for single-instance, memory-constrained servers)
let sessionStore: any;
const MemoryStore = require('memorystore')(session);
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  try {
    const RedisStore = require('connect-redis').default;
    const { createClient } = require('redis');
    const redisClient = createClient({ url: process.env.REDIS_URL, legacyMode: true });
    redisClient.connect().catch(() => {});
    sessionStore = new RedisStore({ client: redisClient });
  } catch (e) {
    // Fallback to memory store if Redis is unavailable
    const FallbackStore = new MemoryStore({ checkPeriod: 86400000 });
    sessionStore = FallbackStore;
  }
} else {
  sessionStore = new MemoryStore({ checkPeriod: 86400000 });
}

// Session configuration
const sessionConfig = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  rolling: true, // Reset expiration on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS (nginx terminates TLS)
    httpOnly: true, // Prevent XSS attacks
    maxAge: 86400000, // 24 hours in milliseconds (auto-cleanup via MemoryStore)
    sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  },
  name: 'mayhem.sid', // Custom session cookie name
});

export { sessionConfig, sessionStore };
