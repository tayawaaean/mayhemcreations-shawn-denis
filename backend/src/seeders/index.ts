import { logger } from '../utils/logger';
import { syncDatabase, sequelize } from '../config/database';
import { seedRoles, clearRoles } from './roleSeeder';
import { seedUsers, clearUsers, clearNonSystemUsers } from './userSeeder';
import { seedCategories, clearCategories } from './categorySeeder';
import { seedProducts, clearProducts } from './productSeeder';
import { seedVariants, clearVariants } from './variantSeeder';
import { seedEmbroideryOptions, clearEmbroideryOptions } from './embroideryOptionSeeder';
import { seedFAQs, clearFAQs } from './faqSeeder';
import { seedMaterialCosts, clearMaterialCosts } from './materialCostSeeder';
import { updateMessagesSchemaForAttachments } from './messageAttachmentSeeder';
import { seedMultiImageProducts, clearMultiImageProducts, updateExistingProductsWithImages } from './multiImageProductSeeder';
import { 
  seedCategoriesViaAPI, 
  seedProductsViaAPI, 
  seedVariantsViaAPI, 
  seedEmbroideryOptionsViaAPI 
} from './apiSeederService';
import { 
  clearAllOrders, 
  resetOrdersToPending, 
  clearOrderReviews, 
  clearCarts, 
  clearCustomEmbroidery 
} from './clearOrdersSeeder';
import { Op } from 'sequelize';
import Message from '../models/messageModel';

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

/**
 * Update products table schema to support multiple images
 */
async function updateProductsSchema(): Promise<void> {
  try {
    logger.info('🔄 Updating products table schema for multi-image support...');
    
    // Check if columns already exist
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'products' 
      AND COLUMN_NAME IN ('images', 'primary_image_index')
    `);
    
    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
    logger.info(`📊 Existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add missing columns
    const columnsToAdd = [];
    
    if (!existingColumns.includes('images')) {
      columnsToAdd.push('ADD COLUMN images JSON NULL AFTER image');
    }
    
    if (!existingColumns.includes('primary_image_index')) {
      columnsToAdd.push('ADD COLUMN primary_image_index INT NULL DEFAULT 0 AFTER images');
    }
    
    if (columnsToAdd.length > 0) {
      const alterQuery = `ALTER TABLE products ${columnsToAdd.join(', ')}`;
      logger.info(`🔧 Executing query: ${alterQuery}`);
      
      await sequelize.query(alterQuery);
      logger.info('✅ Products table schema updated successfully');
      logger.info('📝 Added images (JSON) and primary_image_index (INT) columns');
    } else {
      logger.info('✅ Products table already has multi-image columns');
    }
    
  } catch (error) {
    logger.error('❌ Error updating products schema:', error);
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
  faqsOnly?: boolean;
  materialCostsOnly?: boolean;
  multiImageProductsOnly?: boolean;
  updateExistingProducts?: boolean;
  useApi?: boolean; // Use API-based seeding with authentication
}

export async function runSeeders(options: SeederOptions = {}): Promise<void> {
  try {
    logger.info('🚀 Starting database seeding process...');
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);

    // Sync database first
    logger.info('🔄 Syncing database...');
    await syncDatabase(options.force || false);
    logger.info('✅ Database synced successfully!');

    // Always ensure messages table has attachment columns (idempotent)
    logger.info('🔧 Ensuring messages table has attachment columns...');
    await updateMessagesSchemaForAttachments();

    // Update products table schema for multi-image support (controlled by flags)
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly) {
      logger.info('🔧 Updating products table schema...');
      await updateProductsSchema();
    }

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
      if (options.useApi) {
        await seedCategoriesViaAPI({ skipAuth: false });
      } else {
        await seedCategories();
      }
    }

    // Seed products
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.variantsOnly) {
      logger.info('🌱 Seeding products...');
      if (options.useApi) {
        await seedProductsViaAPI({ skipAuth: false });
      } else {
        await seedProducts();
      }
    }

    // Seed variants
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.embroideryOnly) {
      logger.info('🌱 Seeding variants...');
      if (options.useApi) {
        await seedVariantsViaAPI({ skipAuth: false });
      } else {
        await seedVariants();
      }
    }

    // Seed embroidery options
    if (options.embroideryOnly || (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly)) {
      logger.info('🌱 Seeding embroidery options...');
      if (options.useApi) {
        await seedEmbroideryOptionsViaAPI({ skipAuth: false });
      } else {
        await seedEmbroideryOptions(options.clear || false);
      }
    }

    // Seed FAQs
    if (options.faqsOnly || (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.materialCostsOnly)) {
      logger.info('🌱 Seeding FAQs...');
      await seedFAQs();
    }

    // Seed Material Costs
    if (options.materialCostsOnly || (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly)) {
      logger.info('🌱 Seeding material costs...');
      await seedMaterialCosts();
    }

    // Seed Multi-Image Products
    if (options.multiImageProductsOnly || (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly)) {
      logger.info('🌱 Seeding multi-image products...');
      await seedMultiImageProducts();
    }

    // Update existing products with image arrays
    if (options.updateExistingProducts) {
      logger.info('🔄 Updating existing products with image arrays...');
      await updateExistingProductsWithImages();
    }

    // Fresh start for messages
    logger.info('🧹 Clearing chat messages...');
    await Message.sync();
    await Message.destroy({ where: {} });
    logger.info('✅ Chat messages cleared.');

    // Migrate picture reply columns
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly) {
      logger.info('🔧 Migrating picture reply columns...');
      await migratePictureReplyColumns();
    }

    // Fix cart foreign key constraint
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly) {
      logger.info('🔧 Fixing cart foreign key constraint...');
      await fixCartForeignKeyConstraint();
    }

    // Fix cart product_id column type
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly) {
      logger.info('🔧 Fixing cart product_id column type...');
      await fixCartProductIdColumnType();
    }

    // Update order_reviews status ENUM
    if (!options.rolesOnly && !options.usersOnly && !options.categoriesOnly && !options.productsOnly && !options.variantsOnly && !options.embroideryOnly && !options.faqsOnly && !options.materialCostsOnly) {
      logger.info('🔧 Updating order_reviews status ENUM...');
      await updateOrderReviewStatusEnum();
    }

    logger.info('🎉 Database seeding completed successfully!');
    
    // Display summary
    await displaySeedingSummary();
    
  } catch (error) {
    logger.error('❌ Error during seeding process:', error);
    throw error;
  }
}

async function migratePictureReplyColumns(): Promise<void> {
  try {
    logger.info('🔄 Adding picture reply columns to order_reviews table...');
    
    // Check if columns already exist
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'order_reviews' 
      AND COLUMN_NAME IN ('admin_picture_replies', 'customer_confirmations', 'picture_reply_uploaded_at', 'customer_confirmed_at')
    `);
    
    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
    logger.info(`📊 Existing columns: ${existingColumns.join(', ') || 'none'}`);
    
    // Add missing columns
    const columnsToAdd = [];
    
    if (!existingColumns.includes('admin_picture_replies')) {
      columnsToAdd.push('ADD COLUMN admin_picture_replies JSON NULL AFTER admin_notes');
    }
    
    if (!existingColumns.includes('customer_confirmations')) {
      columnsToAdd.push('ADD COLUMN customer_confirmations JSON NULL AFTER admin_picture_replies');
    }
    
    if (!existingColumns.includes('picture_reply_uploaded_at')) {
      columnsToAdd.push('ADD COLUMN picture_reply_uploaded_at DATETIME NULL AFTER customer_confirmations');
    }
    
    if (!existingColumns.includes('customer_confirmed_at')) {
      columnsToAdd.push('ADD COLUMN customer_confirmed_at DATETIME NULL AFTER picture_reply_uploaded_at');
    }
    
    if (columnsToAdd.length > 0) {
      const alterQuery = `ALTER TABLE order_reviews ${columnsToAdd.join(', ')}`;
      logger.info(`🔧 Executing query: ${alterQuery}`);
      
      await sequelize.query(alterQuery);
      logger.info('✅ Picture reply columns added successfully');
    } else {
      logger.info('✅ All picture reply columns already exist');
    }
    
  } catch (error) {
    logger.error('❌ Error migrating picture reply columns:', error);
    throw error;
  }
}

async function fixCartForeignKeyConstraint(): Promise<void> {
  try {
    logger.info('🔄 Fixing cart foreign key constraint...');
    
    // Check if foreign key constraint exists
    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'carts' 
      AND TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    logger.info(`📊 Existing foreign key constraints: ${constraints.length}`);
    
    // Remove foreign key constraint if it exists
    if (constraints.length > 0) {
      for (const constraint of constraints) {
        const constraintData = constraint as any;
        if (constraintData.REFERENCED_TABLE_NAME === 'products') {
          logger.info(`🔧 Dropping foreign key constraint: ${constraintData.CONSTRAINT_NAME}`);
          await sequelize.query(`ALTER TABLE carts DROP FOREIGN KEY ${constraintData.CONSTRAINT_NAME}`);
          logger.info('✅ Foreign key constraint dropped successfully');
        }
      }
    } else {
      logger.info('✅ No foreign key constraints found on carts table');
    }
    
    // Verify the fix
    const [updatedConstraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'carts' 
      AND TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    logger.info(`📊 Updated constraints: ${updatedConstraints.length} remaining`);
    
  } catch (error) {
    logger.error('❌ Error fixing cart foreign key constraint:', error);
    throw error;
  }
}

async function fixCartProductIdColumnType(): Promise<void> {
  try {
    logger.info('🔄 Fixing cart product_id column type...');
    
    // Check current column type
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'carts' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'product_id'
    `);
    
    if (columns.length > 0) {
      const columnInfo = columns[0] as any;
      logger.info(`📊 Current product_id column type: ${columnInfo.COLUMN_TYPE}`);
      
      if (columnInfo.DATA_TYPE === 'int') {
        logger.info('🔧 Converting product_id from INT to VARCHAR...');
        await sequelize.query(`ALTER TABLE carts MODIFY COLUMN product_id VARCHAR(255) NOT NULL`);
        logger.info('✅ product_id column converted to VARCHAR successfully');
      } else {
        logger.info('✅ product_id column is already VARCHAR type');
      }
    } else {
      logger.warn('⚠️ product_id column not found in carts table');
    }
    
  } catch (error) {
    logger.error('❌ Error fixing cart product_id column type:', error);
    throw error;
  }
}

async function updateOrderReviewStatusEnum(): Promise<void> {
  try {
    logger.info('🔄 Updating order_reviews status ENUM...');
    
    // Check if the table exists first
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'order_reviews' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (tables.length === 0) {
      logger.info('⚠️ order_reviews table does not exist, skipping ENUM update');
      return;
    }
    
    // Check current ENUM values
    const [columns] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'order_reviews' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'status'
    `);
    
    if (columns.length > 0) {
      const columnInfo = columns[0] as any;
      logger.info(`📊 Current status column type: ${columnInfo.COLUMN_TYPE}`);
      
      // Check if the new values are already present
      if (columnInfo.COLUMN_TYPE.includes('pending-payment') && columnInfo.COLUMN_TYPE.includes('approved-processing')) {
        logger.info('✅ Status ENUM already includes new values');
        return;
      }
    }
    
    // Update the status column to include new values
    await sequelize.query(`
      ALTER TABLE order_reviews 
      MODIFY COLUMN status ENUM(
        'pending', 
        'approved', 
        'rejected', 
        'needs-changes', 
        'pending-payment', 
        'approved-processing'
      ) NOT NULL DEFAULT 'pending'
    `);
    
    logger.info('✅ order_reviews status ENUM updated successfully');
    
    // Verify the change
    const [updatedColumns] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'order_reviews' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'status'
    `);
    
    if (updatedColumns.length > 0) {
      const updatedColumnInfo = updatedColumns[0] as any;
      logger.info(`📊 Updated status column type: ${updatedColumnInfo.COLUMN_TYPE}`);
    }
    
  } catch (error) {
    logger.error('❌ Error updating order_reviews status ENUM:', error);
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
      case '--faqs-only':
        options.faqsOnly = true;
        break;
      case '--material-costs-only':
        options.materialCostsOnly = true;
        break;
      case '--multi-image-products-only':
        options.multiImageProductsOnly = true;
        break;
      case '--update-existing-products':
        options.updateExistingProducts = true;
        break;
      case '--use-api':
        options.useApi = true;
        break;
      case '--clear-products':
        clearProducts().then(() => {
          logger.info('✅ Products cleared successfully!');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Clear products failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-multi-image-products':
        clearMultiImageProducts().then(() => {
          logger.info('✅ Multi-image products cleared successfully!');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Clear multi-image products failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-data':
        Promise.all([clearProducts(), clearCategories(), clearVariants()]).then(() => {
          logger.info('✅ All data cleared successfully! (Users retained)');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Clear data failed:', error);
          process.exit(1);
        });
        break;
      case '--update-schema':
        updateSchema().then(() => {
          logger.info('✅ Schema updated successfully!');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Schema update failed:', error);
          process.exit(1);
        });
        break;
      case '--update-products-schema':
        updateProductsSchema().then(() => {
          logger.info('✅ Products schema updated successfully!');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Products schema update failed:', error);
          process.exit(1);
        });
        break;
      case '--update-messages-schema':
        updateMessagesSchemaForAttachments().then(() => {
          logger.info('✅ Messages schema updated successfully!');
          process.exit(0);
        }).catch((error: unknown) => {
          logger.error('❌ Messages schema update failed:', error);
          process.exit(1);
        });
        break;
      case '--reset':
        resetDatabase().then(() => process.exit(0)).catch((error: unknown) => {
          logger.error('❌ Reset failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-all':
        clearAllData().then(() => process.exit(0)).catch((error: unknown) => {
          logger.error('❌ Clear failed:', error);
          process.exit(1);
        });
        break;
      case '--clear-orders':
        clearAllOrders().then(() => process.exit(0)).catch((error: unknown) => {
          logger.error('❌ Clear orders failed:', error);
          process.exit(1);
        });
        break;
      case '--reset-orders':
        resetOrdersToPending().then(() => process.exit(0)).catch((error: unknown) => {
          logger.error('❌ Reset orders failed:', error);
          process.exit(1);
        });
        break;
    }
  }

  // Run seeders
  runSeeders(options).then(() => {
    logger.info('✅ Seeding process completed!');
    process.exit(0);
  }).catch((error: unknown) => {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  });
}
