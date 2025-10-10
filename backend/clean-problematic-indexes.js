const { sequelize } = require('./dist/config/database');

async function cleanProblematicIndexes() {
  try {
    console.log('🧹 Cleaning up problematic database indexes...');
    
    // List of tables that might have too many indexes
    const tablesToCheck = [
      'products',
      'variants', 
      'categories',
      'users',
      'sessions',
      'orders',
      'order_items',
      'cart_items',
      'messages',
      'embroidery_options',
      'material_costs',
      'custom_embroidery_requests',
      'payments',
      'oauth_providers'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        console.log(`\n🔍 Checking table: ${tableName}`);
        
        // Get all indexes for this table
        const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
        
        if (indexes.length === 0) {
          console.log(`   ℹ️  Table ${tableName} doesn't exist or has no indexes`);
          continue;
        }
        
        console.log(`   📊 Found ${indexes.length} indexes`);
        
        // Group indexes by name
        const indexGroups = {};
        indexes.forEach(index => {
          if (!indexGroups[index.Key_name]) {
            indexGroups[index.Key_name] = [];
          }
          indexGroups[index.Key_name].push(index);
        });
        
        // Find indexes with too many columns (more than 5)
        const problematicIndexes = [];
        Object.entries(indexGroups).forEach(([indexName, indexColumns]) => {
          if (indexColumns.length > 5 && indexName !== 'PRIMARY') {
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
          
          // Drop problematic indexes
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
        
      } catch (error) {
        console.log(`   ❌ Error checking table ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Index cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  }
}

cleanProblematicIndexes().then(() => {
  console.log('✅ Cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
