import { Sequelize } from 'sequelize';

// Database configuration with connection pooling
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'mayhem_creation',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  dialect: 'mysql',
  // Disable SQL query logging - too verbose and cluttered
  // Set DB_LOGGING=true in .env if you need to debug SQL queries
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  pool: {
    max: 20, // Maximum number of connections in pool
    min: 5,  // Minimum number of connections in pool
    acquire: 30000, // Maximum time to get connection from pool
    idle: 10000,    // Maximum time a connection can be idle
  },
  define: {
    timestamps: true, // Add createdAt and updatedAt to all models
    underscored: true, // Use snake_case for column names
    freezeTableName: true, // Don't pluralize table names
    indexes: [], // Disable automatic index creation to prevent duplicate key errors
    // beforeSync hook removed - was causing excessive logging during model sync
  },
  dialectOptions: {
    charset: 'utf8mb4',
    // collate removed - handled at database level, not connection level
  },
});

// Test database connection
const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Sync database with models
const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    // Import models to ensure they're registered
    await import('../models');
    
    // Disable foreign key checks temporarily to avoid constraint errors during table creation
    // This is especially important when creating tables in a fresh database where order matters
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    try {
      // Use force: true to drop and recreate all tables (for db:reset)
      // Use alter: true to modify existing tables without dropping (for development)
      const isDev = process.env.NODE_ENV === 'development';
      if (force) {
        // Force mode: drop all tables and recreate (used by db:reset)
        await sequelize.sync({ force: true });
      } else if (isDev) {
        // Development mode: alter existing tables
        await sequelize.sync({ force: false, alter: true });
      }
      // Production mode: do nothing (use migrations instead)
      
      // Re-enable foreign key checks
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Database synchronized successfully.');
    } catch (error) {
      // Ensure foreign key checks are re-enabled even if sync fails
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        // Ignore error if query fails
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

export { sequelize, testConnection, syncDatabase };
