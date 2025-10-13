#!/usr/bin/env node

/**
 * Multi-Image Product Seeder Script
 * 
 * This script seeds the database with products that have multiple images
 * to demonstrate the new slideshow functionality.
 * 
 * Usage:
 *   npm run seed:multi-image-products
 *   npm run seed:multi-image-products -- --clear
 *   npm run seed:multi-image-products -- --update-existing
 */

import { logger } from '../utils/logger';
import { seedMultiImageProducts, clearMultiImageProducts, updateExistingProductsWithImages } from './multiImageProductSeeder';
import { syncDatabase } from '../config/database';

async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const shouldUpdateExisting = args.includes('--update-existing');

    logger.info('🚀 Starting Multi-Image Product Seeder...');

    // Sync database first
    logger.info('🔄 Syncing database...');
    await syncDatabase(false);
    logger.info('✅ Database synced successfully!');

    if (shouldClear) {
      logger.info('🧹 Clearing existing multi-image products...');
      await clearMultiImageProducts();
      logger.info('✅ Multi-image products cleared!');
    }

    if (shouldUpdateExisting) {
      logger.info('🔄 Updating existing products with image arrays...');
      await updateExistingProductsWithImages();
      logger.info('✅ Existing products updated!');
    }

    // Seed multi-image products
    logger.info('🌱 Seeding multi-image products...');
    await seedMultiImageProducts();
    logger.info('✅ Multi-image products seeded successfully!');

    logger.info('🎉 Multi-Image Product Seeding completed!');
    logger.info('');
    logger.info('📋 Available CLI options:');
    logger.info('   --clear              Clear existing multi-image products first');
    logger.info('   --update-existing   Update existing single-image products with image arrays');
    logger.info('');
    logger.info('💡 You can now test the slideshow functionality in the ecommerce section!');

  } catch (error) {
    logger.error('❌ Multi-Image Product Seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
main();






























