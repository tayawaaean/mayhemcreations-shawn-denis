-- Add email column to messages table for guest users
-- This allows storing guest email addresses for conversation summaries

-- Step 1: Add email column
ALTER TABLE messages ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL 
  COMMENT 'Email address for guest users (NULL for registered users)';

-- Step 2: Add index for faster email queries
CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);

-- Step 3: Verify the changes
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
  AND COLUMN_NAME = 'email';
