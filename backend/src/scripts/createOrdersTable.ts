/**
 * Script to create the orders table
 * Run this script to create the orders table for storing completed orders
 * 
 * Usage: npx ts-node src/scripts/createOrdersTable.ts
 */

import { sequelize } from '../config/database';
import Order from '../models/orderModel';
import { logger } from '../utils/logger';

async function createOrdersTable() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Create the orders table - force: true will drop the table if it exists
    // WARNING: This will delete all existing data in the orders table
    // Use { alter: true } instead to modify the table structure without losing data
    await Order.sync({ force: false, alter: true });
    
    console.log('✅ Orders table created/updated successfully');
    
    // Show table info
    const tableInfo = await sequelize.query(`DESCRIBE orders`);
    console.log('\n📊 Orders Table Structure:');
    console.table(tableInfo[0]);
    
    logger.info('Orders table creation completed');
    
  } catch (error) {
    console.error('❌ Error creating orders table:', error);
    logger.error('Orders table creation failed:', error);
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createOrdersTable()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export default createOrdersTable;

