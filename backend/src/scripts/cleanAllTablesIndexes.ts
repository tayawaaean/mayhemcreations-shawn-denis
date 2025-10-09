/**
 * Clean All Tables Indexes Script
 * Remove duplicate indexes from all tables to fix the 64-key limit issue
 */

import { sequelize } from '../config/database';

const cleanAllTablesIndexes = async (): Promise<void> => {
  try {
    console.log('🧹 Starting comprehensive index cleanup for all tables...');
    
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

    console.log('📊 Cleaning up indexes for all tables...');

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
        console.log(`🧹 Cleaning up ${tableName} (${indexCount} indexes)...`);
        
        // Remove ALL indexes except PRIMARY
        for (const index of indexes as any[]) {
          const indexName = index.INDEX_NAME;
          
          if (indexName !== 'PRIMARY') {
            try {
              console.log(`  🗑️  Removing index: ${indexName}`);
              await sequelize.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
            } catch (error) {
              console.log(`  ⚠️  Could not remove index ${indexName}:`, (error as Error).message);
            }
          }
        }
        
        // Add essential indexes back
        await addEssentialIndexes(tableName);
        
        console.log(`  ✅ ${tableName} cleanup completed`);
      } else {
        console.log(`  ✅ ${tableName} has ${indexCount} indexes (OK)`);
      }
    }

    console.log('✅ All tables cleanup completed');
    
  } catch (error) {
    console.error('❌ Error cleaning tables:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

const addEssentialIndexes = async (tableName: string): Promise<void> => {
  try {
    // Add essential indexes based on table name
    switch (tableName) {
      case 'users':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_email\` (\`email\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_role_id\` (\`role_id\`)`);
        break;
        
      case 'sessions':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_session_id\` (\`session_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_user_id\` (\`user_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
        break;
        
      case 'products':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_sku\` (\`sku\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_slug\` (\`slug\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_category_id\` (\`category_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_status\` (\`status\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_featured\` (\`featured\`)`);
        break;
        
      case 'categories':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_slug\` (\`slug\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_parent_id\` (\`parent_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_status\` (\`status\`)`);
        break;
        
      case 'variants':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_sku\` (\`sku\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_product_id\` (\`product_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
        break;
        
      case 'material_costs':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_name\` (\`name\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
        break;
        
      case 'roles':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD UNIQUE INDEX \`unique_name\` (\`name\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_is_active\` (\`is_active\`)`);
        break;
        
      case 'order_reviews':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_user_id\` (\`user_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_status\` (\`status\`)`);
        break;
        
      case 'carts':
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_user_id\` (\`user_id\`)`);
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`idx_product_id\` (\`product_id\`)`);
        break;
        
      default:
        // For other tables, just add basic indexes
        console.log(`  ℹ️  No specific indexes defined for ${tableName}`);
    }
  } catch (error) {
    console.log(`  ⚠️  Could not add essential indexes for ${tableName}:`, (error as Error).message);
  }
};

// Run the script if called directly
if (require.main === module) {
  cleanAllTablesIndexes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanAllTablesIndexes };
