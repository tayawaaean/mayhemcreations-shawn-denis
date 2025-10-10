import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

// Define types for index information
interface IndexRow {
  Table: string;
  Non_unique: number;
  Key_name: string;
  Seq_in_index: number;
  Column_name: string;
  Collation: string | null;
  Cardinality: number | null;
  Sub_part: number | null;
  Packed: string | null;
  Null: string;
  Index_type: string;
  Comment: string;
  Index_comment: string;
}

interface IndexGroups {
  [key: string]: IndexRow[];
}

interface ProblematicIndex {
  name: string;
  columns: number;
  details: string;
}

interface TableResult {
  table: string;
  status: string;
  message?: string;
  totalIndexes?: number;
  droppedIndexes?: number;
  droppedIndexNames?: string[];
}

/**
 * Clean up problematic database indexes
 * This endpoint helps resolve "Too many keys specified; max 64 keys allowed" errors
 */
export const cleanIndexes = async (req: Request, res: Response): Promise<void> => {
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
    
    const results: TableResult[] = [];
    
    for (const tableName of tablesToCheck) {
      try {
        logger.info(`🔍 Checking table: ${tableName}`);
        
        // Get all indexes for this table
        const [indexes] = await sequelize.query<IndexRow>(
          `SHOW INDEX FROM \`${tableName}\``,
          { type: QueryTypes.SELECT }
        ) as [IndexRow[], unknown];
        
        if (!indexes || indexes.length === 0) {
          results.push({
            table: tableName,
            status: 'skipped',
            message: 'Table does not exist or has no indexes'
          });
          continue;
        }
        
        logger.info(`   📊 Found ${indexes.length} indexes`);
        
        // Group indexes by name
        const indexGroups: IndexGroups = {};
        indexes.forEach((index: IndexRow) => {
          if (!indexGroups[index.Key_name]) {
            indexGroups[index.Key_name] = [];
          }
          indexGroups[index.Key_name].push(index);
        });
        
        const totalIndexes = Object.keys(indexGroups).length;
        const droppedIndexes: string[] = [];
        
        // Check if there are too many total indexes (more than 20)
        if (totalIndexes > 20) {
          logger.warn(`   ⚠️  Table ${tableName} has ${totalIndexes} indexes (too many)`);
          
          // Drop non-essential indexes (keep PRIMARY, UNIQUE, and foreign key indexes)
          for (const [indexName, indexColumns] of Object.entries(indexGroups)) {
            if (indexName !== 'PRIMARY' && 
                !indexName.includes('_ibfk_') && // Foreign key indexes
                !indexColumns.some((col: IndexRow) => col.Non_unique === 0)) { // Not unique indexes
              
              try {
                await sequelize.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
                droppedIndexes.push(indexName);
                logger.info(`      ✅ Dropped non-essential index: ${indexName}`);
              } catch (error) {
                const err = error as Error;
                logger.error(`      ❌ Failed to drop index ${indexName}: ${err.message}`);
              }
            }
          }
        }
        
        // Find indexes with too many columns (more than 5)
        const problematicIndexes: ProblematicIndex[] = [];
        Object.entries(indexGroups).forEach(([indexName, indexColumns]: [string, IndexRow[]]) => {
          if (indexColumns.length > 5 && indexName !== 'PRIMARY') {
            problematicIndexes.push({
              name: indexName,
              columns: indexColumns.length,
              details: indexColumns.map((col: IndexRow) => col.Column_name).join(', ')
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
              const err = error as Error;
              logger.error(`      ❌ Failed to drop index ${index.name}: ${err.message}`);
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
        const err = error as Error;
        logger.error(`   ❌ Error checking table ${tableName}: ${err.message}`);
        results.push({
          table: tableName,
          status: 'error',
          message: err.message
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
    const err = error as Error;
    logger.error('❌ Error during index cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up indexes',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
};
