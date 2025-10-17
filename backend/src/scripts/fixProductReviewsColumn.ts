/**
 * Fix product_reviews table - Update product_id column to VARCHAR(255)
 * This allows storing both numeric IDs and string IDs like 'custom-embroidery'
 * 
 * Run with: npx ts-node src/scripts/fixProductReviewsColumn.ts
 */

import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

const fixProductReviewsColumn = async () => {
  try {
    logger.info('🚀 Starting product_reviews column fix...');
    logger.info('📋 Target: Change product_id from INT to VARCHAR(255)');
    logger.info('');

    // Step 1: Check current column type
    logger.info('Step 1: Checking current column type...');
    const [columnInfo] = await sequelize.query(`
      SELECT COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_reviews'
        AND COLUMN_NAME = 'product_id'
    `);

    if (Array.isArray(columnInfo) && columnInfo.length > 0) {
      const info = columnInfo[0] as any;
      logger.info('📊 Current column info:', {
        type: info.COLUMN_TYPE,
        dataType: info.DATA_TYPE,
        nullable: info.IS_NULLABLE,
        comment: info.COLUMN_COMMENT
      });

      if (info.DATA_TYPE === 'varchar') {
        logger.info('✅ Column is already VARCHAR - no changes needed!');
        logger.info('🎉 Custom embroidery reviews are ready to go!');
        return;
      }
    } else {
      logger.error('❌ product_reviews table or product_id column not found!');
      process.exit(1);
    }

    // Step 2: Check for existing reviews
    logger.info('');
    logger.info('Step 2: Checking existing reviews...');
    const [reviewCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM product_reviews
    `);
    const count = (reviewCount[0] as any).count;
    logger.info(`📊 Found ${count} existing review(s)`);

    if (count > 0) {
      logger.info('✅ Existing reviews will be preserved and automatically converted');
    }

    // Step 3: Check for foreign key constraints
    logger.info('');
    logger.info('Step 3: Checking for foreign key constraints...');
    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_reviews'
        AND COLUMN_NAME = 'product_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (Array.isArray(constraints) && constraints.length > 0) {
      const constraintNames = constraints.map((c: any) => c.CONSTRAINT_NAME);
      logger.info(`📋 Found ${constraints.length} foreign key constraint(s):`, constraintNames);
      
      // Drop each foreign key constraint
      for (const constraint of constraints) {
        const constraintName = (constraint as any).CONSTRAINT_NAME;
        logger.info(`🔧 Dropping foreign key: ${constraintName}`);
        await sequelize.query(`
          ALTER TABLE product_reviews
          DROP FOREIGN KEY ${constraintName}
        `);
        logger.info(`✅ Dropped: ${constraintName}`);
      }
    } else {
      logger.info('📋 No foreign key constraints found');
    }

    // Step 4: Alter the column
    logger.info('');
    logger.info('Step 4: Altering product_id column to VARCHAR(255)...');
    logger.info('⏳ This may take a moment...');
    
    await sequelize.query(`
      ALTER TABLE product_reviews 
      MODIFY COLUMN product_id VARCHAR(255) NOT NULL
      COMMENT 'Product ID - supports both numeric IDs and string IDs like "custom-embroidery"'
    `);
    
    logger.info('✅ Column altered successfully!');

    // Step 5: Verify the change
    logger.info('');
    logger.info('Step 5: Verifying the change...');
    const [verifyResult] = await sequelize.query(`
      SELECT COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_reviews'
        AND COLUMN_NAME = 'product_id'
    `);

    if (Array.isArray(verifyResult) && verifyResult.length > 0) {
      const verified = verifyResult[0] as any;
      logger.info('📊 Updated column info:', {
        type: verified.COLUMN_TYPE,
        dataType: verified.DATA_TYPE,
        nullable: verified.IS_NULLABLE,
        comment: verified.COLUMN_COMMENT
      });

      if (verified.DATA_TYPE === 'varchar') {
        logger.info('');
        logger.info('✅✅✅ SUCCESS! ✅✅✅');
        logger.info('🎉 product_reviews.product_id now supports VARCHAR(255)');
        logger.info('📝 Custom embroidery reviews can now be submitted!');
        logger.info('');
        logger.info('Next steps:');
        logger.info('1. Go to My Orders');
        logger.info('2. Click "Review" on a custom embroidery item');
        logger.info('3. Submit your review');
        logger.info('4. Check the Custom Embroidery page to see it appear!');
      } else {
        logger.error('❌ Verification failed - column is not VARCHAR');
      }
    }

  } catch (error: any) {
    logger.error('');
    logger.error('❌❌❌ ERROR ❌❌❌');
    logger.error('Migration failed:', error.message);
    logger.error('');
    logger.error('Full error details:');
    logger.error(error);
    throw error;
  } finally {
    await sequelize.close();
    logger.info('');
    logger.info('🔌 Database connection closed');
  }
};

// Run the fix
logger.info('═══════════════════════════════════════════════════════');
logger.info('  Product Reviews Column Fix Script');
logger.info('═══════════════════════════════════════════════════════');
logger.info('');

fixProductReviewsColumn()
  .then(() => {
    logger.info('');
    logger.info('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('');
    logger.error('💥 Script failed with error');
    process.exit(1);
  });

