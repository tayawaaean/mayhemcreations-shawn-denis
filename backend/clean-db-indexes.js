const mysql = require('mysql2/promise');

async function cleanDatabaseIndexes() {
  let connection;
  
  try {
    console.log('🧹 Connecting to database to clean indexes...');
    
    // Create connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'mayhem_creation',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Connected to database');
    
    // Get all tables
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`📋 Found ${tables.length} tables`);
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n🔍 Checking table: ${tableName}`);
      
      try {
        // Get all indexes for this table
        const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);
        
        if (indexes.length === 0) {
          console.log(`   ℹ️  Table ${tableName} has no indexes`);
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
        
        // Find indexes with too many columns (more than 5) or too many total indexes
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
        
        // Also check if there are too many total indexes (more than 20)
        const totalIndexes = Object.keys(indexGroups).length;
        if (totalIndexes > 20) {
          console.log(`   ⚠️  Table ${tableName} has ${totalIndexes} indexes (too many)`);
          
          // Drop non-essential indexes (keep PRIMARY, UNIQUE, and foreign key indexes)
          for (const [indexName, indexColumns] of Object.entries(indexGroups)) {
            if (indexName !== 'PRIMARY' && 
                !indexName.includes('_ibfk_') && // Foreign key indexes
                !indexColumns.some(col => col.Non_unique === 0)) { // Not unique indexes
              
              try {
                await connection.execute(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
                console.log(`      ✅ Dropped non-essential index: ${indexName}`);
              } catch (error) {
                console.log(`      ❌ Failed to drop index ${indexName}: ${error.message}`);
              }
            }
          }
        }
        
        if (problematicIndexes.length > 0) {
          console.log(`   ⚠️  Found ${problematicIndexes.length} problematic indexes:`);
          problematicIndexes.forEach(index => {
            console.log(`      - ${index.name}: ${index.columns} columns (${index.details})`);
          });
          
          // Drop problematic indexes
          for (const index of problematicIndexes) {
            try {
              await connection.execute(`DROP INDEX \`${index.name}\` ON \`${tableName}\``);
              console.log(`      ✅ Dropped index: ${index.name}`);
            } catch (error) {
              console.log(`      ❌ Failed to drop index ${index.name}: ${error.message}`);
            }
          }
        } else if (totalIndexes <= 20) {
          console.log(`   ✅ No problematic indexes found`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking table ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Index cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

cleanDatabaseIndexes().then(() => {
  console.log('✅ Cleanup complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
