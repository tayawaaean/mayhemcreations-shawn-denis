import mysql from 'mysql2/promise';

/**
 * Verification script to check if guest chat schema is correctly applied
 */
async function verifyGuestChatSchema() {
  let connection;
  
  try {
    console.log('🔍 Verifying guest chat schema...\n');

    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });

    // Check messages table structure
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'mayhem_creation'
        AND TABLE_NAME = 'messages'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📊 Messages Table Structure:');
    console.log('═'.repeat(100));
    (columns as any[]).forEach((col: any) => {
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.DATA_TYPE.padEnd(15)} | ${col.COLUMN_TYPE.padEnd(30)} | Nullable: ${col.IS_NULLABLE}`);
      if (col.COLUMN_COMMENT) {
        console.log(`  → Comment: ${col.COLUMN_COMMENT}`);
      }
    });
    console.log('═'.repeat(100));

    // Check for required columns
    const columnNames = (columns as any[]).map((col: any) => col.COLUMN_NAME);
    const requiredColumns = ['customer_id', 'is_guest', 'sender', 'text', 'type', 'attachment'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns:', missingColumns.join(', '));
    } else {
      console.log('\n✅ All required columns present!');
    }

    // Check customer_id type
    const customerIdCol = (columns as any[]).find((col: any) => col.COLUMN_NAME === 'customer_id');
    if (customerIdCol) {
      if (customerIdCol.DATA_TYPE === 'varchar') {
        console.log('✅ customer_id is VARCHAR - supports guest IDs');
      } else {
        console.log(`⚠️  customer_id is ${customerIdCol.DATA_TYPE} - should be VARCHAR`);
      }
    }

    // Check is_guest column
    const isGuestCol = (columns as any[]).find((col: any) => col.COLUMN_NAME === 'is_guest');
    if (isGuestCol) {
      console.log('✅ is_guest column exists');
    } else {
      console.log('❌ is_guest column missing');
    }

    // Check indexes
    const [indexes] = await connection.query(`
      SHOW INDEX FROM messages
    `);

    console.log('\n📑 Table Indexes:');
    console.log('═'.repeat(100));
    (indexes as any[]).forEach((idx: any) => {
      console.log(`${idx.Key_name.padEnd(40)} | Column: ${idx.Column_name.padEnd(20)} | Unique: ${idx.Non_unique === 0 ? 'Yes' : 'No'}`);
    });
    console.log('═'.repeat(100));

    console.log('\n✅ Schema verification complete!');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run verification
verifyGuestChatSchema();

