import { logger } from '../utils/logger';
import { syncDatabase } from '../config/database';
import { seedRoles } from './roleSeeder';
import { seedUsers } from './userSeeder';
import { seedCategories } from './categorySeeder';
import { seedProducts } from './productSeeder';
import { seedVariants } from './variantSeeder';
import { seedEmbroideryOptions } from './embroideryOptionSeeder';
import { seedFAQs } from './faqSeeder';
import { seedMaterialCosts } from './materialCostSeeder';
import { sequelize } from '../config/database';

export interface ComprehensiveSeederOptions {
  force?: boolean;
  clear?: boolean;
  skipRoles?: boolean;
  skipUsers?: boolean;
  skipCategories?: boolean;
  skipProducts?: boolean;
  skipVariants?: boolean;
  skipEmbroidery?: boolean;
  skipFAQs?: boolean;
  skipMaterialCosts?: boolean;
  skipPictureReplyMigration?: boolean;
  skipCartForeignKeyFix?: boolean;
  skipCartProductIdFix?: boolean;
}

export async function runComprehensiveSeeder(options: ComprehensiveSeederOptions = {}): Promise<void> {
  try {
    logger.info('🚀 Starting comprehensive database seeding...');
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);

    // Sync database first
    logger.info('🔄 Syncing database...');
    await syncDatabase(options.force || false);
    logger.info('✅ Database synced successfully!');

    // Clear data if requested
    if (options.clear) {
      logger.info('🧹 Clearing existing data...');
      // Clear in reverse dependency order
      const { clearVariants } = await import('./variantSeeder');
      const { clearProducts } = await import('./productSeeder');
      const { clearCategories } = await import('./categorySeeder');
      const { clearUsers } = await import('./userSeeder');
      const { clearRoles } = await import('./roleSeeder');
      const { clearFAQs } = await import('./faqSeeder');
      
      await clearFAQs();
      await clearVariants();
      await clearProducts();
      await clearCategories();
      await clearUsers();
      await clearRoles();
      logger.info('✅ All data cleared successfully!');
    }

    // Seed roles
    if (!options.skipRoles) {
      logger.info('🌱 Seeding roles...');
      await seedRoles();
    }

    // Seed users
    if (!options.skipUsers) {
      logger.info('🌱 Seeding users...');
      await seedUsers();
    }

    // Seed categories
    if (!options.skipCategories) {
      logger.info('🌱 Seeding categories...');
      await seedCategories();
    }

    // Seed products
    if (!options.skipProducts) {
      logger.info('🌱 Seeding products...');
      await seedProducts();
    }

    // Seed variants
    if (!options.skipVariants) {
      logger.info('🌱 Seeding variants...');
      await seedVariants();
    }

    // Seed embroidery options
    if (!options.skipEmbroidery) {
      logger.info('🌱 Seeding embroidery options...');
      await seedEmbroideryOptions();
    }

    // Seed FAQs
    if (!options.skipFAQs) {
      logger.info('🌱 Seeding FAQs...');
      await seedFAQs();
    }

    // Seed material costs
    if (!options.skipMaterialCosts) {
      logger.info('🌱 Seeding material costs...');
      await seedMaterialCosts();
    }

    // Schema alterations removed - models are the single source of truth

    logger.info('🎉 Comprehensive seeding completed successfully!');
    
    // Display summary
    await displayComprehensiveSummary();
    
  } catch (error) {
    logger.error('❌ Error during comprehensive seeding process:', error);
    throw error;
  }
}

// Schema alterations removed - models are the single source of truth

// Schema alterations removed - models are the single source of truth

// Schema alterations removed - models are the single source of truth

async function displayComprehensiveSummary(): Promise<void> {
  try {
    const { Role } = await import('../models');
    const { User } = await import('../models');
    const { Category } = await import('../models');
    const { Product } = await import('../models');
    const { Variant } = await import('../models');
    const { EmbroideryOption } = await import('../models');

    const [
      roleCount,
      userCount,
      activeUserCount,
      verifiedUserCount,
      categoryCount,
      activeCategoryCount,
      productCount,
      activeProductCount,
      variantCount,
      activeVariantCount,
      embroideryCount,
      activeEmbroideryCount
    ] = await Promise.all([
      Role.count(),
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isEmailVerified: true } }),
      Category.count(),
      Category.count({ where: { status: 'active' } }),
      Product.count(),
      Product.count({ where: { status: 'active' } }),
      Variant.count(),
      Variant.count({ where: { isActive: true } }),
      EmbroideryOption.count(),
      EmbroideryOption.count({ where: { isActive: true } })
    ]);

    logger.info('📊 Comprehensive Seeding Summary:');
    logger.info(`   • Roles: ${roleCount}`);
    logger.info(`   • Users: ${userCount} (${activeUserCount} active, ${verifiedUserCount} verified)`);
    logger.info(`   • Categories: ${categoryCount} (${activeCategoryCount} active)`);
    logger.info(`   • Products: ${productCount} (${activeProductCount} active)`);
    logger.info(`   • Variants: ${variantCount} (${activeVariantCount} active)`);
    logger.info(`   • Embroidery Options: ${embroideryCount} (${activeEmbroideryCount} active)`);

    // Display roles
    const roles = await Role.findAll({ attributes: ['name', 'displayName'] });
    logger.info('👥 Roles Created:');
    roles.forEach(role => {
      logger.info(`   • ${role.displayName} (${role.name})`);
    });

    // Display main categories
    const mainCategories = await Category.findAll({
      where: { parentId: null as any },
      attributes: ['name', 'slug'],
      order: [['sortOrder', 'ASC']]
    });
    logger.info('📁 Main Categories:');
    mainCategories.forEach(category => {
      logger.info(`   • ${category.name} (${category.slug})`);
    });

    // Display products with variants
    const productsWithVariants = await Product.findAll({
      include: [{
        model: Variant,
        as: 'variants',
        required: false
      }],
      attributes: ['title', 'slug'],
      limit: 5
    });
    
    logger.info('🛍️ Sample Products with Variants:');
    productsWithVariants.forEach(product => {
      const variantCount = (product as any).variants?.length || 0;
      logger.info(`   • ${product.title} (${variantCount} variants)`);
    });

    // Display embroidery categories
    const embroideryCategories = await EmbroideryOption.findAll({
      attributes: ['category'],
      group: ['category'],
      raw: true
    });
    logger.info('🧵 Embroidery Categories:');
    embroideryCategories.forEach((item: any) => {
      logger.info(`   • ${item.category}`);
    });

  } catch (error) {
    logger.error('❌ Error displaying comprehensive summary:', error);
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: ComprehensiveSeederOptions = {};

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--force':
        options.force = true;
        break;
      case '--clear':
        options.clear = true;
        break;
      case '--skip-roles':
        options.skipRoles = true;
        break;
      case '--skip-users':
        options.skipUsers = true;
        break;
      case '--skip-categories':
        options.skipCategories = true;
        break;
      case '--skip-products':
        options.skipProducts = true;
        break;
      case '--skip-variants':
        options.skipVariants = true;
        break;
      case '--skip-embroidery':
        options.skipEmbroidery = true;
        break;
      case '--skip-picture-reply-migration':
        options.skipPictureReplyMigration = true;
        break;
      case '--skip-cart-foreign-key-fix':
        options.skipCartForeignKeyFix = true;
        break;
      case '--skip-cart-product-id-fix':
        options.skipCartProductIdFix = true;
        break;
    }
  }

  // Run comprehensive seeder
  runComprehensiveSeeder(options).then(() => {
    logger.info('✅ Comprehensive seeding process completed!');
    process.exit(0);
  }).catch(error => {
    logger.error('❌ Comprehensive seeding failed:', error);
    process.exit(1);
  });
}
