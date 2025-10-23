/**
 * Sync Refund Request History Table
 * This script creates the refund_request_history table using Sequelize model
 * Run with: npx ts-node src/scripts/syncRefundHistoryTable.ts
 */

import { sequelize } from '../config/database';
import { RefundRequestHistory } from '../models/refundRequestHistoryModel';
import { logger } from '../utils/logger';

async function syncRefundHistoryTable() {
  try {
    logger.info('🔄 Starting refund_request_history table synchronization...');

    // Connect to database
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Sync the RefundRequestHistory model
    // force: false means it won't drop existing table
    // alter: true means it will modify table to match model (adds/removes columns as needed)
    await RefundRequestHistory.sync({ alter: true });
    
    logger.info('✅ Successfully synchronized refund_request_history table');
    logger.info('📊 Table structure:');
    logger.info('   - Tracks all refund request actions (created, approved, rejected, etc.)');
    logger.info('   - Stores audit trail for compliance');
    logger.info('   - Enables abuse detection and prevention');
    logger.info('   - Indexes on: refund_request_id, user_id, order_id, action, created_at');

    // Verify table exists by running a simple query
    const count = await RefundRequestHistory.count();
    logger.info(`✅ Table verified. Current history entries: ${count}`);

    // Display sample queries
    logger.info('\n📝 Sample queries you can run:');
    logger.info('   - Get refund history for a request:');
    logger.info('     SELECT * FROM refund_request_history WHERE refund_request_id = ?');
    logger.info('   - Get all rejections for a user:');
    logger.info('     SELECT * FROM refund_request_history WHERE user_id = ? AND action = "rejected"');
    logger.info('   - Get rejection rate by user:');
    logger.info('     SELECT user_id, COUNT(*) as total, SUM(action="rejected") as rejected FROM refund_request_history GROUP BY user_id');

    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Error syncing refund_request_history table:', error.message);
    logger.error(error);
    process.exit(1);
  }
}

// Run the sync function
syncRefundHistoryTable();









