/**
 * Check All Tables for Index Issues
 * Check all tables for excessive indexes
 */

import { sequelize } from '../config/database';

const checkAllTables = async (): Promise<void> => {
  try {
    console.log('🔍 Checking all tables for index issues...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'mayhem_creation' 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    console.log('📊 Checking tables for excessive indexes...');

    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      
      // Get indexes for this table
      const [indexes] = await sequelize.query(`
        SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE,
          INDEX_TYPE
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'mayhem_creation' 
        AND TABLE_NAME = ?
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `, {
        replacements: [tableName]
      });

      const indexCount = (indexes as any[]).length;
      
      if (indexCount > 10) {
        console.log(`⚠️  Table ${tableName} has ${indexCount} indexes:`);
        (indexes as any[]).forEach((idx, i) => {
          console.log(`  ${i+1}. ${idx.INDEX_NAME} on ${idx.COLUMN_NAME} (unique: ${idx.NON_UNIQUE === 0})`);
        });
      } else if (indexCount > 5) {
        console.log(`⚠️  Table ${tableName} has ${indexCount} indexes (getting high)`);
      } else {
        console.log(`✅ Table ${tableName} has ${indexCount} indexes (OK)`);
      }
    }

    console.log('✅ Table check completed');
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  checkAllTables()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkAllTables };
