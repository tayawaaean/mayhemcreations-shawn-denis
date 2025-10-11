import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

/**
 * Migration script to enable guest chat support
 * Modifies the messages table to accept both numeric user IDs and guest string IDs
 * Uses direct MySQL connection for reliability
 */
async function migrateMessagesForGuests() {
  let connection;
  
  try {
    console.log('🔄 Starting migration: Enable guest chat support...');

    // Create direct MySQL connection using dbconfig.txt credentials
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123password',
      database: 'mayhem_creation'
    });

    console.log('✅ Connected to database');

    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'migrateMessagesForGuests.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 100)}...`);
      try {
        await connection.query(statement);
        console.log('✅ Success');
      } catch (err: any) {
        // Ignore "duplicate column" or "doesn't exist" errors
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`⚠️  Skipped (already exists): ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 The messages table now supports:');
    console.log('   - Numeric user IDs (e.g., "10", "42")');
    console.log('   - Guest string IDs (e.g., "guest_1697123456789_abc123")');
    console.log('   - is_guest flag to differentiate guest messages');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the migration
migrateMessagesForGuests();

