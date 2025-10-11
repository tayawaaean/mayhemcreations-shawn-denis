-- Migration: Enable guest chat support in messages table
-- This script modifies the messages table to support both numeric user IDs and guest string IDs

-- Step 1: Drop the foreign key constraint if it exists
ALTER TABLE messages DROP FOREIGN KEY IF EXISTS `messages_ibfk_1`;
ALTER TABLE messages DROP FOREIGN KEY IF EXISTS `messages_customer_id_foreign`;
ALTER TABLE messages DROP FOREIGN KEY IF EXISTS `fk_messages_customer`;

-- Step 2: Modify customer_id column to VARCHAR to support guest IDs
ALTER TABLE messages MODIFY COLUMN customer_id VARCHAR(255) NOT NULL 
  COMMENT 'User ID (numeric) or guest ID (guest_xxx)';

-- Step 3: Add is_guest column to flag guest messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT FALSE 
  COMMENT 'True if message is from a guest user';

-- Step 4: Update existing records - mark all existing messages as non-guest
UPDATE messages SET is_guest = FALSE WHERE is_guest IS NULL;

-- Step 5: Add index for faster guest queries
CREATE INDEX IF NOT EXISTS idx_messages_customer_guest ON messages(customer_id, is_guest);
CREATE INDEX IF NOT EXISTS idx_messages_is_guest ON messages(is_guest);

-- Step 6: Verify the changes
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
  AND COLUMN_NAME IN ('customer_id', 'is_guest');

