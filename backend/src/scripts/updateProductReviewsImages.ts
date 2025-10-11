/**
 * Migration script to update product_reviews.images column to LONGTEXT
 * This allows storing base64-encoded images (much larger than TEXT)
 */

import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

async function updateProductReviewsImagesColumn() {
  try {
    logger.info('🔄 Updating product_reviews.images column to LONGTEXT...');

    await sequelize.query(`
      ALTER TABLE product_reviews 
      MODIFY COLUMN images LONGTEXT 
      COMMENT 'JSON array of review image URLs (base64)';
    `);

    logger.info('✅ Successfully updated product_reviews.images column to LONGTEXT');
    logger.info('📸 The column can now store base64-encoded images');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error updating product_reviews.images column:', error);
    process.exit(1);
  }
}

updateProductReviewsImagesColumn();

