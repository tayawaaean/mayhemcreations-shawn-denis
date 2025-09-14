import { logger } from '../utils/logger';
import { syncDatabase, sequelize } from '../config/database';
import { seedRoles, clearRoles } from './roleSeeder';
import { seedUsers, clearUsers, clearNonSystemUsers } from './userSeeder';
import { seedCategories, clearCategories } from './categorySeeder';
import { seedProducts, clearProducts } from './productSeeder';
import { seedVariants, clearVariants } from './variantSeeder';
import { seedEmbroideryOptions, clearEmbroideryOptions } from './embroideryOptionSeeder';
import { Op } from 'sequelize';

/**
 * Main Seeder Runner
 * This script manages database seeding for development and testing
 */

/**
 * Update database schema
 */
async function updateSchema(): Promise<void> {
  try {
    logger.info('🔄 Updating database schema...');
    
    // Import models to ensure they're loaded
    await import('../models/categoryModel');
    
    // Force sync the Category table to update the schema
    await sequelize.sync({ alter: true, force: false });
    
    // Also run the direct ALTER command as backup
    await sequelize.query(`
      ALTER TABLE Categories 
      MODIFY COLUMN image TEXT
    `);
    
    logger.info('✅ Database schema updated successfully!');
    logger.info('📝 Image column changed from VARCHAR(500) to TEXT');
    logger.info('🔄 Models synced with alter: true');
  } catch (error) {
    logger.error('❌ Error updating schema:', error);
    throw error;
  }
}

export interface SeederOptions {
  force?: boolean;
  clear?: boolean;
  rolesOnly?: boolean;
  usersOnly?: boolean;
  categoriesOnly?: boolean;
  productsOnly?: boolean;
  variantsOnly?: boolean;
  embroideryOnly?: boolean;
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
      } else if (options.categoriesOnly) {
        await clearProducts(); // Clear products first to avoid foreign key constraint
        await clearCategories();
      } else if (options.productsOnly) {
        await clearProducts();
      } else if (options.variantsOnly) {
        await clearVariants();
      } else if (options.embroideryOnly) {
        await clearEmbroideryOptions();
      } else {
        await clearUsers();
        await clearRoles();
        await clearVariants(); // Clear variants first to avoid foreign key constraint
        await clearProducts(); // Clear products second to avoid foreign key constraint
        await clearCategories();
        await clearEmbroideryOptions();
      }
    }

    // Seed roles
    if (!options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly) {
      logger.info('🌱 Seeding roles...');
      await seedRoles();
    }

    // Seed users
    if (!options.rolesOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly) {
      logger.info('🌱 Seeding users...');
      await seedUsers();
    }

    // Seed categories
    if (!options.rolesOnly && !options.usersOnly && !options.productsOnly && !options.variantsOnly) {
      logger.info('🌱 Seeding categories...');
      await seedCategories();
    }

    // Seed products
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.variantsOnly) {
      logger.info('🌱 Seeding products...');
      await seedProducts();
    }

    // Seed variants
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.embroideryOnly) {
      logger.info('🌱 Seeding variants...');
      await seedVariants();
    }

    // Seed embroidery options
    if (options.embroideryOnly || (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly)) {
      logger.info('🌱 Seeding embroidery options...');
      await seedEmbroideryOptions(options.clear || false);
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
    await clearVariants(); // Clear variants first to avoid foreign key constraint
    await clearProducts(); // Clear products second to avoid foreign key constraint
    await clearCategories();
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
    const { Category } = await import('../models/categoryModel');
    const Product = (await import('../models/productModel')).default;
    const { Variant } = await import('../models/variantModel');

    const roleCount = await Role.count();
    const userCount = await User.count();
    const activeUserCount = await User.count({ where: { isActive: true } });
    const verifiedUserCount = await User.count({ where: { isEmailVerified: true } });
    const categoryCount = await Category.count();
    const activeCategoryCount = await Category.count({ where: { status: 'active' } });
    const productCount = await Product.count();
    const activeProductCount = await Product.count({ where: { status: 'active' } });
    const variantCount = await Variant.count();
    const activeVariantCount = await Variant.count({ where: { isActive: true } });

    logger.info('📊 Seeding Summary:');
    logger.info(`   • Roles created: ${roleCount}`);
    logger.info(`   • Total users: ${userCount}`);
    logger.info(`   • Active users: ${activeUserCount}`);
    logger.info(`   • Verified users: ${verifiedUserCount}`);
    logger.info(`   • Total categories: ${categoryCount}`);
    logger.info(`   • Active categories: ${activeCategoryCount}`);
    logger.info(`   • Total products: ${productCount}`);
    logger.info(`   • Active products: ${activeProductCount}`);
    logger.info(`   • Total variants: ${variantCount}`);
    logger.info(`   • Active variants: ${activeVariantCount}`);
    
    // Display role breakdown
    const roles = await Role.findAll({
      attributes: ['name', 'displayName']
    });

    logger.info('👥 Roles Created:');
    for (const role of roles) {
      const displayName = role.displayName || role.name;
      logger.info(`   • ${displayName} (${role.name})`);
    }

    // Display category breakdown
    const rootCategories = await Category.findAll({
      where: { parentId: { [Op.is]: null } } as any,
      attributes: ['name', 'slug'],
      order: [['sortOrder', 'ASC']]
    });

    logger.info('📁 Categories Created:');
    for (const category of rootCategories) {
      logger.info(`   • ${category.name} (${category.slug})`);
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
      case '--categories-only':
        options.categoriesOnly = true;
        break;
      case '--products-only':
        options.productsOnly = true;
        break;
      case '--variants-only':
        options.variantsOnly = true;
        break;
      case '--embroidery-only':
        options.embroideryOnly = true;
        break;
      case '--clear-products':
        clearProducts().then(() => {
          logger.info('✅ Products cleared successfully!');
          process.exit(0);
        }).catch(error => {
          logger.error('❌ Clear products failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-data':
        Promise.all([clearProducts(), clearCategories(), clearVariants()]).then(() => {
          logger.info('✅ All data cleared successfully! (Users retained)');
          process.exit(0);
        }).catch(error => {
          logger.error('❌ Clear data failed:', error);
          process.exit(1);
        });
        break;
      case '--update-schema':
        updateSchema().then(() => {
          logger.info('✅ Schema updated successfully!');
          process.exit(0);
        }).catch(error => {
          logger.error('❌ Schema update failed:', error);
          process.exit(1);
        });
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
