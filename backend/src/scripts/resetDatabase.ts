import 'dotenv/config'
import mysql from 'mysql2/promise'
import { logger } from '../utils/logger'
import { runSeeders } from '../seeders'

async function dropAndRecreateDatabase(): Promise<void> {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'mayhem_creation',
  } = process.env

  // Connect without specifying database to allow DROP/CREATE
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  })

  try {
    logger.info(`Dropping database if exists: ${DB_NAME}`)
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``)

    logger.info(`Creating database: ${DB_NAME}`)
    await connection.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
  } finally {
    await connection.end()
  }
}

async function main(): Promise<void> {
  try {
    logger.info('🔧 Resetting database using environment configuration...')
    await dropAndRecreateDatabase()
    logger.info('✅ Database recreated. Running seeders...')

    // Run comprehensive seeding
    await runSeeders({ clear: true })

    logger.info('🎉 Database reset and seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    logger.error('❌ Database reset and seeding failed:', error)
    process.exit(1)
  }
}

// Execute when run directly
if (require.main === module) {
  main()
}


