/**
 * Create Payments Table Script
 * Creates the payments table for tracking payment transactions
 */

import { sequelize } from '../config/database';

const createPaymentsTable = async (): Promise<void> => {
  try {
    console.log('🔧 Creating payments table...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Create payments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        order_number VARCHAR(50) NOT NULL,
        customer_id INT NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        provider ENUM('stripe', 'paypal') NOT NULL,
        payment_method ENUM('card', 'bank_transfer', 'digital_wallet', 'crypto', 'cash', 'check') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending',
        transaction_id VARCHAR(255) NOT NULL UNIQUE,
        provider_transaction_id VARCHAR(255) NOT NULL,
        gateway_response JSON,
        processed_at DATETIME NULL,
        failed_at DATETIME NULL,
        refunded_at DATETIME NULL,
        refund_amount DECIMAL(10, 2) NULL,
        fees DECIMAL(10, 2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(10, 2) NOT NULL,
        metadata JSON,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        INDEX idx_customer_id (customer_id),
        INDEX idx_provider (provider),
        INDEX idx_status (status),
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_provider_transaction_id (provider_transaction_id),
        INDEX idx_created_at (created_at),
        INDEX idx_customer_status (customer_id, status),
        
        FOREIGN KEY (order_id) REFERENCES order_reviews(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Payments table created successfully');
    
    // Verify table was created
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'mayhem_creation' 
      AND TABLE_NAME = 'payments'
    `);

    if (Array.isArray(tables) && tables.length > 0) {
      console.log('✅ Payments table verified in database');
    } else {
      console.log('❌ Payments table not found after creation');
    }

    console.log('🎉 Payments table setup completed successfully');
    
  } catch (error) {
    console.error('❌ Error creating payments table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run the script if called directly
if (require.main === module) {
  createPaymentsTable()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { createPaymentsTable };
