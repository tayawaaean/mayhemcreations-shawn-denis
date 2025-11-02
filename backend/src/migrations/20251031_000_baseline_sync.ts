import { Sequelize } from 'sequelize'

// Baseline migration: create/align tables to current models once.
// Future changes should be implemented as explicit migrations.

export async function up(queryInterface: any, _Sequelize: typeof Sequelize) {
  // CRITICAL: Import models to ensure they're registered with Sequelize
  // Without importing models, sequelize.sync() won't know which tables to create
  await import('../models')
  
  // One-time baseline: align schema with current models
  // This will create all tables defined in models/index.ts if they don't exist
  // And alter existing tables to match model definitions
  const sequelize: Sequelize = queryInterface.sequelize
  
  // Disable foreign key checks temporarily to avoid constraint errors during table creation
  // This allows tables to be created in any order without foreign key constraint failures
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0')
  
  try {
    await sequelize.sync({ alter: true })
  } finally {
    // Re-enable foreign key checks after sync completes (or fails)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
  }
  
  console.log('✅ Baseline sync completed: All model tables created/aligned')
}

export async function down(_queryInterface: any, _Sequelize: typeof Sequelize) {
  // No-op: baseline is not reversible; use specific down migrations for changes.
}


