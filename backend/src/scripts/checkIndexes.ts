/**
 * Check Database Indexes Script
 * Check current state of indexes on roles table
 */

import { sequelize } from '../config/database';

const checkIndexes = async (): Promise<void> => {
  try {
    console.log('🔍 Checking current database indexes...');
    
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

    if (indexCount > 10) {
      console.log('⚠️  Too many indexes detected!');
      
      // Show which indexes are duplicates
      const nameIndexes = (indexes as any[]).filter(idx => 
        idx.COLUMN_NAME === 'name' && idx.INDEX_NAME !== 'PRIMARY'
      );
      
      console.log('🔍 Name column indexes:');
      nameIndexes.forEach(idx => console.log(`  - ${idx.INDEX_NAME} (unique: ${idx.NON_UNIQUE === 0})`));
    } else {
      console.log('✅ Index count is reasonable');
    }

    console.log('✅ Index check completed');
    
  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  checkIndexes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkIndexes };
