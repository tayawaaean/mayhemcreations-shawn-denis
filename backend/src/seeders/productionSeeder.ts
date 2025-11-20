import { logger } from '../utils/logger';
import { syncDatabase, sequelize } from '../config/database';
import { seedRoles, clearRoles } from './roleSeeder';
import { seedUsers, clearUsers } from './userSeeder';
import { seedEmbroideryOptions, clearEmbroideryOptions } from './embroideryOptionSeeder';
import { seedFAQs, clearFAQs } from './faqSeeder';
import { seedMaterialCosts, clearMaterialCosts } from './materialCostSeeder';
import { seedAddresses, clearAddresses } from './addressSeeder';
import { clearProducts } from './productSeeder';
import { clearCategories } from './categorySeeder';
import { clearVariants } from './variantSeeder';
import { clearAllOrders, clearOrderReviews } from './clearOrdersSeeder';
import Message from '../models/messageModel';

/**
 * Production Seeder
 * This script seeds only essential production data without customer-facing content like products/categories
 * Use this for production environments to seed system data without sample products
 */

export interface ProductionSeederOptions {
  force?: boolean;
  clear?: boolean;
  rolesOnly?: boolean;
  usersOnly?: boolean;
  embroideryOnly?: boolean;
  faqsOnly?: boolean;
  materialCostsOnly?: boolean;
  addressesOnly?: boolean;
}

export async function runProductionSeeders(options: ProductionSeederOptions = {}): Promise<void> {
  try {
    logger.info('🚀 Starting production database seeding process...');
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);

    // Sync database first (but don't force in production unless explicitly requested)
    if (options.force) {
      logger.info('🔄 Syncing database with force mode...');
      await syncDatabase(true);
      logger.info('✅ Database synced successfully!');
    } else {
      logger.info('🔄 Syncing database (alter mode)...');
      await syncDatabase(false);
      logger.info('✅ Database synced successfully!');
    }

    // Clear data if requested
    if (options.clear) {
      logger.info('🧹 Clearing existing data...');
      if (options.rolesOnly) {
        logger.info('⚠️ Skipping role clearing for roles-only seeding');
      } else if (options.usersOnly) {
        // Clear dependent data before clearing users
        try {
          logger.info('🧹 Clearing refund requests...');
          await sequelize.query('DELETE FROM refund_requests');
        } catch (error: any) {
          if (!error.message?.includes("doesn't exist")) {
            logger.warn('⚠️ Error clearing refund requests:', error.message);
          }
        }
        try {
          logger.info('🧹 Clearing orders...');
          await clearOrderReviews();
        } catch (error: any) {
          logger.warn('⚠️ Error clearing orders:', error.message);
        }
        try {
          logger.info('🧹 Clearing payments...');
          await sequelize.query('DELETE FROM payments');
        } catch (error: any) {
          if (!error.message?.includes("doesn't exist")) {
            logger.warn('⚠️ Error clearing payments:', error.message);
          }
        }
        await clearUsers();
      } else if (options.embroideryOnly) {
        await clearEmbroideryOptions();
      } else if (options.faqsOnly) {
        await clearFAQs();
      } else if (options.materialCostsOnly) {
        await clearMaterialCosts();
      } else if (options.addressesOnly) {
        await clearAddresses();
      } else {
        // Clear all production seedable data
        // Also clear products, categories, and variants (even though we don't seed them)
        logger.info('🧹 Clearing order-related data first (to avoid foreign key constraints)...');
        
        // Clear refund requests first (they reference order_reviews)
        try {
          logger.info('🧹 Clearing refund requests...');
          const [refundResult] = await sequelize.query('DELETE FROM refund_requests');
          const refundCount = (refundResult as any).affectedRows || 0;
          logger.info(`✅ Cleared ${refundCount} refund requests`);
        } catch (error: any) {
          // If table doesn't exist, just log and continue
          if (error.message?.includes("doesn't exist")) {
            logger.info('ℹ️ Refund requests table does not exist, skipping...');
          } else {
            logger.warn('⚠️ Error clearing refund requests:', error.message);
          }
        }
        
        // Clear orders and related data (this will clear order_reviews)
        await clearAllOrders();
        
        // Clear payments (they reference users)
        try {
          logger.info('🧹 Clearing payments...');
          const [paymentResult] = await sequelize.query('DELETE FROM payments');
          const paymentCount = (paymentResult as any).affectedRows || 0;
          logger.info(`✅ Cleared ${paymentCount} payments`);
        } catch (error: any) {
          if (error.message?.includes("doesn't exist")) {
            logger.info('ℹ️ Payments table does not exist, skipping...');
          } else {
            logger.warn('⚠️ Error clearing payments:', error.message);
          }
        }
        
        logger.info('🧹 Clearing products, categories, and variants...');
        await clearVariants(); // Clear variants first to avoid foreign key constraint
        await clearProducts(); // Clear products second to avoid foreign key constraint
        await clearCategories();
        
        logger.info('🧹 Clearing production seedable data...');
        await clearUsers(); // Now safe to clear users
        await clearRoles();
        await clearEmbroideryOptions();
        await clearFAQs();
        await clearMaterialCosts();
        await clearAddresses();
      }
    }

    // Seed roles
    if (!options.usersOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly && !options.addressesOnly) {
      logger.info('🌱 Seeding roles...');
      await seedRoles();
    }

    // Seed users
    if (!options.rolesOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly && !options.addressesOnly) {
      logger.info('🌱 Seeding users...');
      await seedUsers();
    }

    // Seed embroidery options
    if (options.embroideryOnly || (!options.rolesOnly && !options.usersOnly && !options.faqsOnly && !options.materialCostsOnly && !options.addressesOnly)) {
      logger.info('🌱 Seeding embroidery options...');
      await seedEmbroideryOptions(options.clear || false);
    }

    // Seed FAQs
    if (options.faqsOnly || (!options.rolesOnly && !options.usersOnly && !options.embroideryOnly && !options.materialCostsOnly && !options.addressesOnly)) {
      logger.info('🌱 Seeding FAQs...');
      await seedFAQs();
    }

    // Seed Material Costs
    if (options.materialCostsOnly || (!options.rolesOnly && !options.usersOnly && !options.embroideryOnly && !options.faqsOnly && !options.addressesOnly)) {
      logger.info('🌱 Seeding material costs...');
      await seedMaterialCosts();
    }

    // Seed Addresses
    if (options.addressesOnly || (!options.rolesOnly && !options.usersOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly)) {
      logger.info('🌱 Seeding addresses...');
      await seedAddresses();
    }

    // Clear messages data
    logger.info('🧹 Clearing chat messages...');
    await Message.destroy({ where: {} });
    logger.info('✅ Chat messages cleared.');

    logger.info('🎉 Production database seeding completed successfully!');
    
    // Display summary
    await displayProductionSeedingSummary();
    
  } catch (error) {
    logger.error('❌ Error during production seeding process:', error);
    throw error;
  }
}

async function displayProductionSeedingSummary(): Promise<void> {
  try {
    const { Role, User, EmbroideryOption } = await import('../models');
    const FAQ = (await import('../models/faqModel')).default;
    const MaterialCost = (await import('../models/materialCostModel')).default;
    const Address = (await import('../models/addressModel')).default;

    const roleCount = await Role.count();
    const userCount = await User.count();
    const activeUserCount = await User.count({ where: { isActive: true } });
    const verifiedUserCount = await User.count({ where: { isEmailVerified: true } });
    const embroideryOptionCount = await EmbroideryOption.count();
    const activeEmbroideryOptionCount = await EmbroideryOption.count({ where: { isActive: true } });
    const faqCount = await FAQ.count();
    const activeFaqCount = await FAQ.count({ where: { status: 'active' } });
    const materialCostCount = await MaterialCost.count();
    const activeMaterialCostCount = await MaterialCost.count({ where: { isActive: true } });
    const addressCount = await Address.count();
    const defaultOriginCount = await Address.count({ where: { type: 'origin', is_default: true } });

    logger.info('📊 Production Seeding Summary:');
    logger.info(`   • Roles created: ${roleCount}`);
    logger.info(`   • Total users: ${userCount}`);
    logger.info(`   • Active users: ${activeUserCount}`);
    logger.info(`   • Verified users: ${verifiedUserCount}`);
    logger.info(`   • Total embroidery options: ${embroideryOptionCount}`);
    logger.info(`   • Active embroidery options: ${activeEmbroideryOptionCount}`);
    logger.info(`   • Total FAQs: ${faqCount}`);
    logger.info(`   • Active FAQs: ${activeFaqCount}`);
    logger.info(`   • Total material costs: ${materialCostCount}`);
    logger.info(`   • Active material costs: ${activeMaterialCostCount}`);
    logger.info(`   • Total addresses: ${addressCount}`);
    logger.info(`   • Default origin addresses: ${defaultOriginCount}`);
    
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
    logger.warn('⚠️ Could not display production seeding summary:', error);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: ProductionSeederOptions = {};

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
      case '--embroidery-only':
        options.embroideryOnly = true;
        break;
      case '--faqs-only':
        options.faqsOnly = true;
        break;
      case '--material-costs-only':
        options.materialCostsOnly = true;
        break;
      case '--addresses-only':
        options.addressesOnly = true;
        break;
    }
  }

  // Run production seeders
  runProductionSeeders(options).then(() => {
    logger.info('✅ Production seeding process completed!');
    process.exit(0);
  }).catch((error: unknown) => {
    logger.error('❌ Production seeding failed:', error);
    process.exit(1);
  });
}

