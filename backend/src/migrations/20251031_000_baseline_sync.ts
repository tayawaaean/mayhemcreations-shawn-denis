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
  await sequelize.sync({ alter: true })
  
  console.log('✅ Baseline sync completed: All model tables created/aligned')
}

export async function down(_queryInterface: any, _Sequelize: typeof Sequelize) {
  // No-op: baseline is not reversible; use specific down migrations for changes.
}


