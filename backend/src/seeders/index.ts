import { logger } from '../utils/logger';
import { syncDatabase } from '../config/database';
import { seedRoles, clearRoles } from './roleSeeder';
import { seedUsers, clearUsers, clearNonSystemUsers } from './userSeeder';

/**
 * Main Seeder Runner
 * This script manages database seeding for development and testing
 */

export interface SeederOptions {
  force?: boolean;
  clear?: boolean;
  rolesOnly?: boolean;
  usersOnly?: boolean;
}

export async function runSeeders(options: SeederOptions = {}): Promise<void> {
  try {
    logger.info('🚀 Starting database seeding process...');
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);

    // Sync database first
    logger.info('🔄 Syncing database...');
    await syncDatabase(options.force || false);
    logger.info('✅ Database synced successfully!');

    // Clear data if requested
    if (options.clear) {
      logger.info('🧹 Clearing existing data...');
      if (options.usersOnly) {
        await clearNonSystemUsers();
      } else if (options.rolesOnly) {
        // Don't clear roles if we're only seeding roles
        logger.info('⚠️ Skipping role clearing for roles-only seeding');
      } else {
        await clearUsers();
        await clearRoles();
      }
    }

    // Seed roles
    if (!options.usersOnly) {
      logger.info('🌱 Seeding roles...');
      await seedRoles();
    }

    // Seed users
    if (!options.rolesOnly) {
      logger.info('🌱 Seeding users...');
      await seedUsers();
    }

    logger.info('🎉 Database seeding completed successfully!');
    
    // Display summary
    await displaySeedingSummary();
    
  } catch (error) {
    logger.error('❌ Error during seeding process:', error);
    throw error;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    logger.info('🧹 Clearing all database data...');
    await clearUsers();
    await clearRoles();
    logger.info('✅ All data cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing data:', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    logger.info('🔄 Resetting database...');
    await syncDatabase(true); // Force recreate tables
    await runSeeders({ clear: true });
    logger.info('✅ Database reset completed successfully!');
  } catch (error) {
    logger.error('❌ Error resetting database:', error);
    throw error;
  }
}

async function displaySeedingSummary(): Promise<void> {
  try {
    const { Role } = await import('../models/roleModel');
    const { User } = await import('../models/userModel');

    const roleCount = await Role.count();
    const userCount = await User.count();
    const activeUserCount = await User.count({ where: { isActive: true } });
    const verifiedUserCount = await User.count({ where: { isEmailVerified: true } });

    logger.info('📊 Seeding Summary:');
    logger.info(`   • Roles created: ${roleCount}`);
    logger.info(`   • Total users: ${userCount}`);
    logger.info(`   • Active users: ${activeUserCount}`);
    logger.info(`   • Verified users: ${verifiedUserCount}`);
    
    // Display role breakdown
    const roles = await Role.findAll({
      attributes: ['name', 'displayName']
    });

    logger.info('👥 Roles Created:');
    for (const role of roles) {
      const displayName = role.displayName || role.name;
      logger.info(`   • ${displayName} (${role.name})`);
    }

  } catch (error) {
    logger.warn('⚠️ Could not display seeding summary:', error);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeederOptions = {};

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--force':
        options.force = true;
        break;
      case '--clear':
        options.clear = true;
        break;
      case '--roles-only':
        options.rolesOnly = true;
        break;
      case '--users-only':
        options.usersOnly = true;
        break;
      case '--reset':
        resetDatabase().then(() => process.exit(0)).catch(error => {
          logger.error('❌ Reset failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-all':
        clearAllData().then(() => process.exit(0)).catch(error => {
          logger.error('❌ Clear failed:', error);
          process.exit(1);
        });
        break;
    }
  }

  // Run seeders
  runSeeders(options).then(() => {
    logger.info('✅ Seeding process completed!');
    process.exit(0);
  }).catch(error => {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}
