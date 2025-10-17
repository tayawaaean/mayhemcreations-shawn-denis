import { sequelize } from '../config/database';

/**
 * Migration script to add email column to messages table
 * This allows storing guest email addresses for conversation summaries
 */
async function addEmailToMessages() {
  try {
    console.log('🔧 Adding email column to messages table...');
    
    // Add email column
    await sequelize.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL 
      COMMENT 'Email address for guest users (NULL for registered users)'
    `);
    
    console.log('✅ Email column added successfully');
    
    // Add index for faster email queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email)
    `);
    
    console.log('✅ Email index created successfully');
    
    // Verify the changes
    const [results] = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'messages'
        AND COLUMN_NAME = 'email'
    `);
    
    console.log('📊 Email column details:');
    console.table(results);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  addEmailToMessages()
    .then(() => {
      console.log('🎉 Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { addEmailToMessages };
