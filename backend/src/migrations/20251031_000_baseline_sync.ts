import { Sequelize } from 'sequelize'

// Baseline migration: create/align tables to current models once.
// Future changes should be implemented as explicit migrations.

export async function up(queryInterface: any, _Sequelize: typeof Sequelize) {
  // One-time baseline: align schema with current models
  const sequelize: Sequelize = queryInterface.sequelize
  await sequelize.sync({ alter: true })
}

export async function down(_queryInterface: any, _Sequelize: typeof Sequelize) {
  // No-op: baseline is not reversible; use specific down migrations for changes.
}


