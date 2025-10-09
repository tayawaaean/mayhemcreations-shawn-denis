/**
 * Clean All Database Indexes Script
 * Remove all duplicate indexes and prevent Sequelize from adding more
 */

import { sequelize } from '../config/database';

const cleanAllIndexes = async (): Promise<void> => {
  try {
    console.log('🧹 Starting comprehensive index cleanup...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get current indexes for roles table
    const [indexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'mayhem_creation' 
      AND TABLE_NAME = 'roles'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log('📊 Current indexes on roles table:');
    console.table(indexes);

    // Count total indexes
    const indexCount = (indexes as any[]).length;
    console.log(`📈 Total indexes: ${indexCount}`);

    // Remove ALL indexes except PRIMARY
    console.log('🗑️  Removing all non-primary indexes...');
    
    for (const index of indexes as any[]) {
      const indexName = index.INDEX_NAME;
      
      if (indexName !== 'PRIMARY') {
        try {
          console.log(`🗑️  Removing index: ${indexName}`);
          await sequelize.query(`DROP INDEX \`${indexName}\` ON \`roles\``);
        } catch (error) {
          console.log(`⚠️  Could not remove index ${indexName}:`, (error as Error).message);
        }
      }
    }
    
    console.log('✅ All non-primary indexes removed');

    // Add only the essential unique constraint
    try {
      console.log('🔧 Adding unique constraint to name field...');
      await sequelize.query(`
        ALTER TABLE \`roles\` 
        ADD CONSTRAINT \`unique_role_name\` UNIQUE (\`name\`)
      `);
      console.log('✅ Unique constraint added successfully');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Duplicate key name') || errorMessage.includes('already exists')) {
        console.log('ℹ️  Unique constraint already exists');
      } else {
        console.log('⚠️  Could not add unique constraint:', errorMessage);
      }
    }

    // Add index for is_active column for performance
    try {
      console.log('🔧 Adding index for is_active column...');
      await sequelize.query(`
        ALTER TABLE \`roles\` 
        ADD INDEX \`idx_roles_is_active\` (\`is_active\`)
      `);
      console.log('✅ is_active index added successfully');
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Duplicate key name') || errorMessage.includes('already exists')) {
        console.log('ℹ️  is_active index already exists');
      } else {
        console.log('⚠️  Could not add is_active index:', errorMessage);
      }
    }

    // Verify final state
    const [finalIndexes] = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        INDEX_TYPE
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'mayhem_creation' 
      AND TABLE_NAME = 'roles'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);

    console.log('📊 Final indexes on roles table:');
    console.table(finalIndexes);

    const finalCount = (finalIndexes as any[]).length;
    console.log(`📈 Final index count: ${finalCount}`);

    if (finalCount <= 3) {
      console.log('✅ Index cleanup completed successfully');
    } else {
      console.log('⚠️  Still too many indexes, manual intervention may be needed');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning indexes:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  cleanAllIndexes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanAllIndexes };
