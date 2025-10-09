/**
 * Check Payment Tables Script
 * Check if there are any payment-related tables in the database
 */

import { sequelize } from '../config/database';

const checkPaymentTables = async (): Promise<void> => {
  try {
    console.log('🔍 Checking for payment-related tables...');
    
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

    console.log('📊 All tables in database:');
    (tables as any[]).forEach((table, index) => {
      console.log(`${index + 1}. ${table.TABLE_NAME}`);
    });

    // Check for payment-related tables
    const paymentTables = (tables as any[]).filter(table => 
      table.TABLE_NAME.toLowerCase().includes('payment') ||
      table.TABLE_NAME.toLowerCase().includes('transaction') ||
      table.TABLE_NAME.toLowerCase().includes('charge')
    );

    if (paymentTables.length > 0) {
      console.log('\n💰 Payment-related tables found:');
      paymentTables.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('\n❌ No payment-related tables found');
    }

    console.log('\n✅ Table check completed');
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  checkPaymentTables()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { checkPaymentTables };
