import { sequelize } from '../models';
import { logger } from '../utils/logger';

/**
 * Adds columns to messages table for attachment support:
 * - type ENUM('text','image','file') DEFAULT 'text'
 * - attachment JSON NULL
 */
export async function updateMessagesSchemaForAttachments(): Promise<void> {
  try {
    logger.info('🔄 Updating messages table schema for attachments...');

    // Check existing columns
    const [columns]: any = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'messages' 
        AND TABLE_SCHEMA = DATABASE()
        AND COLUMN_NAME IN ('type', 'attachment')
    `);

    const existing = new Set(columns.map((c: any) => c.COLUMN_NAME));
    const ops: string[] = [];

    if (!existing.has('type')) {
      // MySQL ENUM
      ops.push("ADD COLUMN type ENUM('text','image','file') NOT NULL DEFAULT 'text' AFTER text");
    }
    if (!existing.has('attachment')) {
      // JSON column
      ops.push('ADD COLUMN attachment JSON NULL AFTER type');
    }

    if (ops.length > 0) {
      const alter = `ALTER TABLE messages ${ops.join(', ')}`;
      await sequelize.query(alter);
      logger.info('✅ Messages table schema updated for attachments');
    } else {
      logger.info('✅ Messages table already has attachment columns');
    }
  } catch (error) {
    logger.error('❌ Error updating messages schema:', error);
    throw error;
  }
}

export async function seedSampleMessageAttachments(): Promise<void> {
  // Optional: insert a couple of sample rows only if desired. Skipping by default.
}



