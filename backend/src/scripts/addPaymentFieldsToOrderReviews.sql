-- Add payment and shipping fields to order_reviews table
-- This makes order_reviews the single source of truth for all orders

ALTER TABLE order_reviews
  -- Shipping Address (JSON)
  ADD COLUMN shipping_address JSON NULL AFTER admin_notes,
  ADD COLUMN billing_address JSON NULL AFTER shipping_address,
  
  -- Payment Information
  ADD COLUMN payment_method VARCHAR(50) NULL AFTER billing_address,
  ADD COLUMN payment_status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded') NULL DEFAULT 'pending' AFTER payment_method,
  ADD COLUMN payment_provider ENUM('stripe', 'paypal', 'google_pay', 'apple_pay', 'square', 'manual') NULL AFTER payment_status,
  ADD COLUMN payment_intent_id VARCHAR(255) NULL AFTER payment_provider,
  ADD COLUMN transaction_id VARCHAR(255) NULL AFTER payment_intent_id,
  ADD COLUMN card_last4 VARCHAR(4) NULL AFTER transaction_id,
  ADD COLUMN card_brand VARCHAR(50) NULL AFTER card_last4,
  
  -- Order Fulfillment
  ADD COLUMN order_number VARCHAR(50) NULL AFTER card_brand,
  ADD COLUMN tracking_number VARCHAR(255) NULL AFTER order_number,
  ADD COLUMN shipping_carrier VARCHAR(100) NULL AFTER tracking_number,
  ADD COLUMN shipped_at DATETIME NULL AFTER shipping_carrier,
  ADD COLUMN delivered_at DATETIME NULL AFTER shipped_at,
  ADD COLUMN estimated_delivery_date DATETIME NULL AFTER delivered_at,
  
  -- Additional Notes
  ADD COLUMN customer_notes TEXT NULL AFTER estimated_delivery_date,
  ADD COLUMN internal_notes TEXT NULL AFTER customer_notes,
  
  -- Indexes for performance
  ADD INDEX idx_order_number (order_number),
  ADD INDEX idx_payment_status (payment_status),
  ADD INDEX idx_payment_intent_id (payment_intent_id);

