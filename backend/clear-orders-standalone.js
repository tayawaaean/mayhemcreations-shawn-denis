#!/usr/bin/env node

/**
 * Standalone Order Clearing Script
 * This script can be run independently to clear order data
 * 
 * Usage:
 *   node clear-orders-standalone.js                    # Clear all orders
 *   node clear-orders-standalone.js --reset-pending    # Reset to pending state
 *   node clear-orders-standalone.js --help             # Show help
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mayhem_creations',
  charset: 'utf8mb4'
};

async function clearOrderReviews(connection) {
  try {
    console.log('🧹 Clearing order reviews...');
    const [result] = await connection.execute('DELETE FROM order_reviews');
    console.log(`✅ Cleared ${result.affectedRows} order reviews`);
  } catch (error) {
    console.error('❌ Error clearing order reviews:', error.message);
    throw error;
  }
}

async function clearCustomEmbroidery(connection) {
  try {
    console.log('🧹 Clearing custom embroidery orders...');
    const [result] = await connection.execute('DELETE FROM custom_embroidery_orders');
    console.log(`✅ Cleared ${result.affectedRows} custom embroidery orders`);
  } catch (error) {
    console.error('❌ Error clearing custom embroidery orders:', error.message);
    throw error;
  }
}

async function clearCarts(connection) {
  try {
    console.log('🧹 Clearing cart items...');
    const [result] = await connection.execute('DELETE FROM carts');
    console.log(`✅ Cleared ${result.affectedRows} cart items`);
  } catch (error) {
    console.error('❌ Error clearing cart items:', error.message);
    throw error;
  }
}

async function resetCartsToPending(connection) {
  try {
    console.log('🔄 Resetting submitted cart items to pending...');
    const [result] = await connection.execute(`
      UPDATE carts 
      SET review_status = 'pending', 
          order_review_id = NULL 
      WHERE review_status = 'submitted'
    `);
    console.log(`✅ Reset ${result.affectedRows} submitted cart items to pending`);
  } catch (error) {
    console.error('❌ Error resetting cart items:', error.message);
    throw error;
  }
}

async function displaySummary(connection) {
  try {
    const [orderReviews] = await connection.execute('SELECT COUNT(*) as count FROM order_reviews');
    const [cartItems] = await connection.execute('SELECT COUNT(*) as count FROM carts');
    const [pendingCarts] = await connection.execute('SELECT COUNT(*) as count FROM carts WHERE review_status = \'pending\'');
    const [submittedCarts] = await connection.execute('SELECT COUNT(*) as count FROM carts WHERE review_status = \'submitted\'');
    const [customEmbroidery] = await connection.execute('SELECT COUNT(*) as count FROM custom_embroidery_orders');

    console.log('\n📊 Clearing Summary:');
    console.log(`   • Order reviews: ${orderReviews[0].count}`);
    console.log(`   • Total cart items: ${cartItems[0].count}`);
    console.log(`   • Pending cart items: ${pendingCarts[0].count}`);
    console.log(`   • Submitted cart items: ${submittedCarts[0].count}`);
    console.log(`   • Custom embroidery orders: ${customEmbroidery[0].count}`);
  } catch (error) {
    console.warn('⚠️ Could not display summary:', error.message);
  }
}

async function clearAllOrders() {
  let connection;
  try {
    console.log('🚀 Starting complete order clearing process...');
    console.log(`🔌 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');
    
    // Clear in order to avoid foreign key constraints
    await clearOrderReviews(connection);
    await clearCustomEmbroidery(connection);
    await clearCarts(connection);
    
    console.log('✅ All order data cleared successfully!');
    
    // Display summary
    await displaySummary(connection);
    
  } catch (error) {
    console.error('❌ Error during order clearing process:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function resetOrdersToPending() {
  let connection;
  try {
    console.log('🚀 Starting order reset process...');
    console.log(`🔌 Connecting to database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');
    
    // Clear order reviews but keep cart items, just reset their status
    await clearOrderReviews(connection);
    await clearCustomEmbroidery(connection);
    await resetCartsToPending(connection);
    
    console.log('✅ Orders reset to pending state successfully!');
    
    // Display summary
    await displaySummary(connection);
    
  } catch (error) {
    console.error('❌ Error during order reset process:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

function showHelp() {
  console.log(`
🧹 Order Clearing Script

Usage:
  node clear-orders-standalone.js [options]

Options:
  --reset-pending    Reset submitted orders back to pending state (keeps cart items)
  --help            Show this help message

Examples:
  node clear-orders-standalone.js                    # Clear all orders completely
  node clear-orders-standalone.js --reset-pending    # Reset orders to pending state

Environment Variables:
  DB_HOST           Database host (default: localhost)
  DB_PORT           Database port (default: 3306)
  DB_USER           Database username (default: root)
  DB_PASSWORD       Database password (default: empty)
  DB_NAME           Database name (default: mayhem_creations)
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  if (args.includes('--reset-pending')) {
    await resetOrdersToPending();
  } else {
    await clearAllOrders();
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
