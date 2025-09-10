import { Sequelize } from 'sequelize';

// Database configuration with connection pooling
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'mayhem_creations',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
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
  },
  dialectOptions: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
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
    
    // Sync database
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

export { sequelize, testConnection, syncDatabase };
