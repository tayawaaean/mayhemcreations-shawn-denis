// Script to add payment and shipping fields to order_reviews table
// Run this to upgrade the order_reviews table to support full order lifecycle

import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

const addPaymentFieldsToOrderReviews = async (): Promise<void> => {
  try {
    logger.info('🔧 Adding payment and shipping fields to order_reviews table...');

    // Add shipping address fields
    await sequelize.query(`
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS shipping_address JSON NULL AFTER admin_notes,
        ADD COLUMN IF NOT EXISTS billing_address JSON NULL AFTER shipping_address
    `);
    logger.info('✅ Shipping address fields added');

    // Add payment fields
    await sequelize.query(`
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NULL AFTER billing_address,
        ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded') NULL DEFAULT 'pending' AFTER payment_method,
        ADD COLUMN IF NOT EXISTS payment_provider ENUM('stripe', 'paypal', 'google_pay', 'apple_pay', 'square', 'manual') NULL AFTER payment_status,
        ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255) NULL AFTER payment_provider,
        ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) NULL AFTER payment_intent_id,
        ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4) NULL AFTER transaction_id,
        ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50) NULL AFTER card_last4
    `);
    logger.info('✅ Payment fields added');

    // Add order fulfillment fields
    await sequelize.query(`
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS order_number VARCHAR(50) NULL AFTER card_brand,
        ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255) NULL AFTER order_number,
        ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100) NULL AFTER tracking_number,
        ADD COLUMN IF NOT EXISTS shipped_at DATETIME NULL AFTER shipping_carrier,
        ADD COLUMN IF NOT EXISTS delivered_at DATETIME NULL AFTER shipped_at,
        ADD COLUMN IF NOT EXISTS estimated_delivery_date DATETIME NULL AFTER delivered_at
    `);
    logger.info('✅ Order fulfillment fields added');

    // Add additional notes fields
    await sequelize.query(`
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS customer_notes TEXT NULL AFTER estimated_delivery_date,
        ADD COLUMN IF NOT EXISTS internal_notes TEXT NULL AFTER customer_notes
    `);
    logger.info('✅ Additional notes fields added');

    // Add indexes for performance
    await sequelize.query(`
      ALTER TABLE order_reviews
        ADD INDEX IF NOT EXISTS idx_order_number (order_number),
        ADD INDEX IF NOT EXISTS idx_payment_status (payment_status),
        ADD INDEX IF NOT EXISTS idx_payment_intent_id (payment_intent_id)
    `);
    logger.info('✅ Indexes added');

    logger.info('✅ Successfully upgraded order_reviews table with payment and shipping fields');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Error adding payment fields to order_reviews:', error);
    process.exit(1);
  }
};

// Run the script
addPaymentFieldsToOrderReviews();

