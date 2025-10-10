const { Request, Response } = require('express');
const { sequelize } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Clean up problematic database indexes
 * This endpoint helps resolve "Too many keys specified; max 64 keys allowed" errors
 */
const cleanIndexes = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('🧹 Starting database index cleanup...');
    
    // List of tables to check
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
    
    const results = [];
    
    for (const tableName of tablesToCheck) {
      try {
        logger.info(`🔍 Checking table: ${tableName}`);
        
        // Get all indexes for this table
        const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``);
        
        if (indexes.length === 0) {
          results.push({
            table: tableName,
            status: 'skipped',
            message: 'Table does not exist or has no indexes'
          });
          continue;
        }
        
        logger.info(`   📊 Found ${indexes.length} indexes`);
        
        // Group indexes by name
        const indexGroups = {};
        indexes.forEach(index => {
          if (!indexGroups[index.Key_name]) {
            indexGroups[index.Key_name] = [];
          }
          indexGroups[index.Key_name].push(index);
        });
        
        const totalIndexes = Object.keys(indexGroups).length;
        const droppedIndexes = [];
        
        // Check if there are too many total indexes (more than 20)
        if (totalIndexes > 20) {
          logger.warn(`   ⚠️  Table ${tableName} has ${totalIndexes} indexes (too many)`);
          
          // Drop non-essential indexes (keep PRIMARY, UNIQUE, and foreign key indexes)
          for (const [indexName, indexColumns] of Object.entries(indexGroups)) {
            if (indexName !== 'PRIMARY' && 
                !indexName.includes('_ibfk_') && // Foreign key indexes
                !indexColumns.some(col => col.Non_unique === 0)) { // Not unique indexes
              
              try {
                await sequelize.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
                droppedIndexes.push(indexName);
                logger.info(`      ✅ Dropped non-essential index: ${indexName}`);
              } catch (error) {
                logger.error(`      ❌ Failed to drop index ${indexName}: ${error.message}`);
              }
            }
          }
        }
        
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
          logger.warn(`   ⚠️  Found ${problematicIndexes.length} problematic indexes:`);
          problematicIndexes.forEach(index => {
            logger.warn(`      - ${index.name}: ${index.columns} columns (${index.details})`);
          });
          
          // Drop problematic indexes
          for (const index of problematicIndexes) {
            try {
              await sequelize.query(`DROP INDEX \`${index.name}\` ON \`${tableName}\``);
              droppedIndexes.push(index.name);
              logger.info(`      ✅ Dropped index: ${index.name}`);
            } catch (error) {
              logger.error(`      ❌ Failed to drop index ${index.name}: ${error.message}`);
            }
          }
        }
        
        results.push({
          table: tableName,
          status: 'processed',
          totalIndexes,
          droppedIndexes: droppedIndexes.length,
          droppedIndexNames: droppedIndexes
        });
        
      } catch (error) {
        logger.error(`   ❌ Error checking table ${tableName}: ${error.message}`);
        results.push({
          table: tableName,
          status: 'error',
          message: error.message
        });
      }
    }
    
    logger.info('🎉 Index cleanup completed!');
    
    res.json({
      success: true,
      message: 'Database index cleanup completed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Error during index cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up indexes',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { cleanIndexes };
