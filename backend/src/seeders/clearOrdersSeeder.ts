import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Clear Orders Seeder
 * This seeder clears all order-related data from the database
 */

export async function clearOrderReviews(): Promise<void> {
  try {
    logger.info('🧹 Clearing order reviews...');
    
    const [result] = await sequelize.query('DELETE FROM order_reviews');
    const affectedRows = (result as any).affectedRows || 0;
    
    logger.info(`✅ Cleared ${affectedRows} order reviews`);
  } catch (error) {
    logger.error('❌ Error clearing order reviews:', error);
    throw error;
  }
}

export async function clearCarts(): Promise<void> {
  try {
    logger.info('🧹 Clearing cart items...');
    
    const [result] = await sequelize.query('DELETE FROM carts');
    const affectedRows = (result as any).affectedRows || 0;
    
    logger.info(`✅ Cleared ${affectedRows} cart items`);
  } catch (error) {
    logger.error('❌ Error clearing cart items:', error);
    throw error;
  }
}

export async function resetCartItemsToPending(): Promise<void> {
  try {
    logger.info('🔄 Resetting submitted cart items to pending...');
    
    const [result] = await sequelize.query(`
      UPDATE carts 
      SET review_status = 'pending', 
          order_review_id = NULL 
      WHERE review_status = 'submitted'
    `);
    const affectedRows = (result as any).affectedRows || 0;
    
    logger.info(`✅ Reset ${affectedRows} submitted cart items to pending`);
  } catch (error) {
    logger.error('❌ Error resetting cart items:', error);
    throw error;
  }
}

export async function clearCustomEmbroidery(): Promise<void> {
  try {
    logger.info('🧹 Clearing custom embroidery orders...');
    
    const [result] = await sequelize.query('DELETE FROM custom_embroidery_orders');
    const affectedRows = (result as any).affectedRows || 0;
    
    logger.info(`✅ Cleared ${affectedRows} custom embroidery orders`);
  } catch (error) {
    logger.error('❌ Error clearing custom embroidery orders:', error);
    throw error;
  }
}

export async function clearAllOrders(): Promise<void> {
  try {
    logger.info('🚀 Starting complete order clearing process...');
    
    // Clear in order to avoid foreign key constraints
    await clearOrderReviews();
    await clearCustomEmbroidery();
    await clearCarts();
    
    logger.info('✅ All order data cleared successfully!');
    
    // Display summary
    await displayClearingSummary();
    
  } catch (error) {
    logger.error('❌ Error during order clearing process:', error);
    throw error;
  }
}

export async function resetOrdersToPending(): Promise<void> {
  try {
    logger.info('🚀 Starting order reset process...');
    
    // Clear order reviews but keep cart items, just reset their status
    await clearOrderReviews();
    await clearCustomEmbroidery();
    await resetCartItemsToPending();
    
    logger.info('✅ Orders reset to pending state successfully!');
    
    // Display summary
    await displayClearingSummary();
    
  } catch (error) {
    logger.error('❌ Error during order reset process:', error);
    throw error;
  }
}

async function displayClearingSummary(): Promise<void> {
  try {
    // Get counts after clearing
    const [orderReviews] = await sequelize.query('SELECT COUNT(*) as count FROM order_reviews');
    const [cartItems] = await sequelize.query('SELECT COUNT(*) as count FROM carts');
    const [pendingCarts] = await sequelize.query('SELECT COUNT(*) as count FROM carts WHERE review_status = \'pending\'');
    const [submittedCarts] = await sequelize.query('SELECT COUNT(*) as count FROM carts WHERE review_status = \'submitted\'');
    const [customEmbroidery] = await sequelize.query('SELECT COUNT(*) as count FROM custom_embroidery_orders');

    logger.info('📊 Clearing Summary:');
    logger.info(`   • Order reviews: ${orderReviews[0].count}`);
    logger.info(`   • Total cart items: ${cartItems[0].count}`);
    logger.info(`   • Pending cart items: ${pendingCarts[0].count}`);
    logger.info(`   • Submitted cart items: ${submittedCarts[0].count}`);
    logger.info(`   • Custom embroidery orders: ${customEmbroidery[0].count}`);
    
  } catch (error) {
    logger.warn('⚠️ Could not display clearing summary:', error);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--reset-to-pending')) {
    resetOrdersToPending().then(() => {
      logger.info('✅ Order reset completed!');
      process.exit(0);
    }).catch(error => {
      logger.error('❌ Order reset failed:', error);
      process.exit(1);
    });
  } else {
    clearAllOrders().then(() => {
      logger.info('✅ Order clearing completed!');
      process.exit(0);
    }).catch(error => {
      logger.error('❌ Order clearing failed:', error);
      process.exit(1);
    });
  }
}
