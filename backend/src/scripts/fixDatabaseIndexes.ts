/**
 * Fix Database Indexes Script
 * This script removes unnecessary indexes to fix the "Too many keys specified" error
 */

import { sequelize } from '../config/database';

const fixDatabaseIndexes = async (): Promise<void> => {
  try {
    console.log('🔧 Starting database index cleanup...');
    
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

    if (indexCount > 5) {
      console.log('⚠️  Too many indexes detected. Cleaning up...');
      
      // Remove duplicate or unnecessary indexes
      // Keep only essential indexes: PRIMARY, name (unique), and is_active
      const indexesToKeep = ['PRIMARY', 'unique_role_name', 'roles_is_active'];
      
      for (const index of indexes as any[]) {
        const indexName = index.INDEX_NAME;
        
        if (!indexesToKeep.includes(indexName) && !indexName.startsWith('PRIMARY')) {
          try {
            console.log(`🗑️  Removing index: ${indexName}`);
            await sequelize.query(`DROP INDEX \`${indexName}\` ON \`roles\``);
          } catch (error) {
            console.log(`⚠️  Could not remove index ${indexName}:`, (error as Error).message);
          }
        }
      }
      
      console.log('✅ Index cleanup completed');
    } else {
      console.log('✅ Index count is within limits');
    }

    // Now try to add the unique constraint if it doesn't exist
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

    console.log('✅ Database index fix completed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing database indexes:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  fixDatabaseIndexes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixDatabaseIndexes };
