import 'dotenv/config'
import { Sequelize } from 'sequelize'
import { Umzug, SequelizeStorage } from 'umzug'
import { sequelize } from '../config/database'

const umzug = new Umzug({
  migrations: {
    glob: 'src/migrations/*.ts',
    resolve: ({ name, path: migrationPath, context }) => {
      try {
        // With ts-node register, we can use require() with .ts files
        // Clear the require cache to ensure fresh load
        if (migrationPath && require.cache[migrationPath]) {
          delete require.cache[migrationPath]
        }
        
        // Use require() for CommonJS (ts-node handles .ts files)
        const migration = require(migrationPath!)
        
        // Handle both CommonJS (module.exports) and ES6 (export) formats
        const upFn = migration.up || migration.default?.up
        const downFn = migration.down || migration.default?.down
        
        if (!upFn || typeof upFn !== 'function') {
          throw new Error(`Migration ${name} does not export an 'up' function`)
        }
        
        return {
          name,
          up: async () => {
            await upFn(context.getQueryInterface(), Sequelize)
          },
          down: async () => {
            if (downFn && typeof downFn === 'function') {
              await downFn(context.getQueryInterface(), Sequelize)
            } else {
              console.warn(`Migration ${name} does not have a 'down' function, skipping rollback`)
            }
          },
        }
      } catch (error: any) {
        console.error(`❌ Error loading migration ${name} from ${migrationPath}:`, error.message || error)
        if (error.stack) {
          console.error(error.stack)
        }
        throw error
      }
    },
  },
  context: sequelize,
  storage: new SequelizeStorage({ sequelize, tableName: 'migrations_meta' }),
  logger: {
    info: (message: string) => console.log(`ℹ️  ${message}`),
    warn: (message: string) => console.warn(`⚠️  ${message}`),
    error: (message: string) => console.error(`❌ ${message}`),
    debug: (message: string) => console.log(`🔍 ${message}`),
  },
})

const cmd = process.argv[2]

;(async () => {
  try {
    if (cmd === 'up') {
      console.log('Running migrations...')
      const migrations = await umzug.up()
      if (migrations.length === 0) {
        console.log('No pending migrations to run.')
      } else {
        console.log(`✅ Successfully ran ${migrations.length} migration(s):`)
        migrations.forEach(m => console.log(`  - ${m.name}`))
      }
    } else if (cmd === 'down') {
      console.log('Rolling back migrations...')
      await umzug.down()
    } else if (cmd === 'pending') {
      const pending = await umzug.pending()
      console.log('Pending migrations:')
      if (pending.length === 0) {
        console.log('  No pending migrations.')
      } else {
        pending.forEach(m => console.log(`  - ${m.name}`))
      }
    } else if (cmd === 'executed') {
      const executed = await umzug.executed()
      console.log('Executed migrations:')
      if (executed.length === 0) {
        console.log('  No executed migrations.')
      } else {
        executed.forEach(m => console.log(`  - ${m.name}`))
      }
    } else {
      console.log('Usage: npm run migrate:up | migrate:down | migrate:status')
      console.log('Commands:')
      console.log('  up       - Run all pending migrations')
      console.log('  down     - Rollback last migration')
      console.log('  pending  - Show pending migrations')
      console.log('  executed - Show executed migrations')
      process.exit(1)
    }
    await sequelize.close()
    process.exit(0)
  } catch (err: any) {
    console.error('❌ Migration error:', err.message || err)
    if (err.stack) {
      console.error(err.stack)
    }
    await sequelize.close()
    process.exit(1)
  }
})()


