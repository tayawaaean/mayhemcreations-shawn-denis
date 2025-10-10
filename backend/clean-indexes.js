const { sequelize } = require('./dist/config/database');
const { logger } = require('./dist/utils/logger');

async function cleanIndexes() {
  try {
    console.log('🧹 Starting database index cleanup...');
    
    // Get all tables
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log(`📋 Found ${tables.length} tables`);
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n🔍 Checking indexes for table: ${tableName}`);
      
      // Get all indexes for this table
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
      
      console.log(`   📊 Found ${indexes.length} indexes`);
      
      // Group indexes by name to see duplicates
      const indexGroups = {};
      indexes.forEach(index => {
        if (!indexGroups[index.Key_name]) {
          indexGroups[index.Key_name] = [];
        }
        indexGroups[index.Key_name].push(index);
      });
      
      // Check for problematic indexes
      const problematicIndexes = [];
      Object.entries(indexGroups).forEach(([indexName, indexColumns]) => {
        if (indexColumns.length > 10) { // More than 10 columns in an index
          problematicIndexes.push({
            name: indexName,
            columns: indexColumns.length,
            details: indexColumns.map(col => col.Column_name).join(', ')
          });
        }
      });
      
      if (problematicIndexes.length > 0) {
        console.log(`   ⚠️  Found ${problematicIndexes.length} problematic indexes:`);
        problematicIndexes.forEach(index => {
          console.log(`      - ${index.name}: ${index.columns} columns (${index.details})`);
        });
        
        // Ask if we should clean them up
        console.log(`   🗑️  Cleaning up problematic indexes for ${tableName}...`);
        
        for (const index of problematicIndexes) {
          try {
            await sequelize.query(`DROP INDEX \`${index.name}\` ON \`${tableName}\``);
            console.log(`      ✅ Dropped index: ${index.name}`);
          } catch (error) {
            console.log(`      ❌ Failed to drop index ${index.name}: ${error.message}`);
          }
        }
      } else {
        console.log(`   ✅ No problematic indexes found`);
      }
    }
    
    console.log('\n🎉 Index cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  }
}

cleanIndexes().then(() => {
  console.log('✅ Cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
