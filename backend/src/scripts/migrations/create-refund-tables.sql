-- Migration: Create Refund Management Tables
-- Date: October 14, 2025
-- Description: Creates tables and updates existing tables for refund management system

-- Create refund_requests table
-- This table stores all customer refund requests
CREATE TABLE IF NOT EXISTS refund_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Reference fields to link refund to order and user
  order_id INT NOT NULL COMMENT 'Foreign key to order_reviews table',
  order_number VARCHAR(50) NOT NULL COMMENT 'Human-readable order number',
  user_id INT NOT NULL COMMENT 'Foreign key to users table',
  payment_id INT NULL COMMENT 'Foreign key to payments table',
  
  -- Refund details - amount and type information
  refund_type ENUM('full', 'partial') NOT NULL DEFAULT 'full' COMMENT 'Full or partial refund',
  refund_amount DECIMAL(10, 2) NOT NULL COMMENT 'Amount to be refunded',
  original_amount DECIMAL(10, 2) NOT NULL COMMENT 'Original order amount',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency code (USD, EUR, etc.)',
  
  -- Request information - why customer is requesting refund
  reason ENUM(
    'damaged_defective',
    'wrong_item',
    'not_as_described',
    'changed_mind',
    'duplicate_order',
    'shipping_delay',
    'quality_issues',
    'other'
  ) NOT NULL COMMENT 'Reason for refund request',
  description TEXT NULL COMMENT 'Customer detailed explanation',
  customer_email VARCHAR(255) NOT NULL COMMENT 'Customer email at time of request',
  customer_name VARCHAR(255) NOT NULL COMMENT 'Customer name at time of request',
  
  -- Evidence - images or documents provided by customer
  images_urls JSON NULL COMMENT 'Array of image URLs for proof of damage/defect',
  
  -- Status tracking - current state of the refund request
  status ENUM(
    'pending',           -- Just submitted, waiting for review
    'under_review',      -- Admin is reviewing the request
    'approved',          -- Approved, waiting to be processed
    'rejected',          -- Denied by admin
    'processing',        -- Being processed by payment gateway
    'completed',         -- Successfully refunded
    'failed',            -- Payment gateway failed to process
    'cancelled'          -- Cancelled by customer or admin
  ) NOT NULL DEFAULT 'pending' COMMENT 'Current status of refund request',
  
  -- Processing details - admin decisions and notes
  admin_notes TEXT NULL COMMENT 'Admin internal notes about the refund',
  rejection_reason TEXT NULL COMMENT 'Reason provided to customer for rejection',
  refund_method ENUM('original_payment', 'store_credit', 'manual') DEFAULT 'original_payment' COMMENT 'How refund will be issued',
  
  -- Payment provider details - integration with Stripe/PayPal
  payment_provider ENUM('stripe', 'paypal') NULL COMMENT 'Payment gateway used',
  provider_refund_id VARCHAR(255) NULL COMMENT 'Refund ID from Stripe/PayPal',
  provider_response JSON NULL COMMENT 'Full response from payment gateway',
  
  -- Items being refunded - for partial refunds
  refund_items JSON NULL COMMENT 'Array of items with quantities being refunded: [{productId, variantId, quantity, price}]',
  
  -- Inventory restoration tracking
  inventory_restored BOOLEAN DEFAULT FALSE COMMENT 'Whether stock has been restored',
  inventory_restored_at DATETIME NULL COMMENT 'When stock was restored',
  
  -- Timeline - important dates in the refund lifecycle
  requested_at DATETIME NOT NULL COMMENT 'When customer submitted request',
  reviewed_at DATETIME NULL COMMENT 'When admin reviewed the request',
  processed_at DATETIME NULL COMMENT 'When payment processing started',
  completed_at DATETIME NULL COMMENT 'When refund was completed',
  failed_at DATETIME NULL COMMENT 'When refund processing failed',
  
  -- Standard timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp',
  
  -- Foreign key constraints to maintain referential integrity
  CONSTRAINT fk_refund_order FOREIGN KEY (order_id) REFERENCES order_reviews(id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  
  -- Indexes for query performance
  INDEX idx_refund_order_id (order_id),
  INDEX idx_refund_user_id (user_id),
  INDEX idx_refund_status (status),
  INDEX idx_refund_requested_at (requested_at),
  INDEX idx_refund_order_number (order_number),
  INDEX idx_refund_payment_provider (payment_provider),
  INDEX idx_refund_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores customer refund requests and processing details';

-- Update order_reviews table to track refund status
-- Add columns to track if order has been refunded
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS refund_status ENUM('none', 'requested', 'partial', 'full') DEFAULT 'none' COMMENT 'Refund status of the order',
ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Total amount refunded',
ADD COLUMN IF NOT EXISTS refund_requested_at DATETIME NULL COMMENT 'When first refund was requested';

-- Add index for refund_status to improve query performance
ALTER TABLE order_reviews 
ADD INDEX IF NOT EXISTS idx_order_refund_status (refund_status);

-- Create a view for easy refund reporting
CREATE OR REPLACE VIEW refund_summary AS
SELECT 
    rr.id AS refund_id,
    rr.order_number,
    rr.user_id,
    u.email AS customer_email,
    u.first_name AS customer_first_name,
    u.last_name AS customer_last_name,
    rr.refund_type,
    rr.refund_amount,
    rr.original_amount,
    rr.currency,
    rr.reason,
    rr.status,
    rr.payment_provider,
    rr.refund_method,
    rr.inventory_restored,
    rr.requested_at,
    rr.completed_at,
    DATEDIFF(COALESCE(rr.completed_at, NOW()), rr.requested_at) AS days_to_process,
    o.payment_status AS order_payment_status,
    o.total AS order_total
FROM refund_requests rr
LEFT JOIN users u ON rr.user_id = u.id
LEFT JOIN order_reviews o ON rr.order_id = o.id;

-- Insert sample refund reasons configuration (optional - for reference)
-- This can be used in the application to provide standardized reasons
CREATE TABLE IF NOT EXISTS refund_reason_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Internal reason code',
    display_name VARCHAR(100) NOT NULL COMMENT 'User-friendly display name',
    description TEXT NULL COMMENT 'Detailed description',
    requires_evidence BOOLEAN DEFAULT FALSE COMMENT 'Whether evidence is required',
    auto_approve_eligible BOOLEAN DEFAULT FALSE COMMENT 'Can be auto-approved for low amounts',
    restocking_fee_percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Restocking fee percentage',
    active BOOLEAN DEFAULT TRUE COMMENT 'Whether this reason is currently active',
    sort_order INT DEFAULT 0 COMMENT 'Display order in dropdown',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration for refund reasons';

-- Insert default refund reasons
INSERT INTO refund_reason_config (reason_code, display_name, description, requires_evidence, auto_approve_eligible, restocking_fee_percentage, sort_order) VALUES
('damaged_defective', 'Product Damaged or Defective', 'Item arrived damaged, defective, or not working properly', TRUE, FALSE, 0.00, 1),
('wrong_item', 'Wrong Item Received', 'Received a different item than what was ordered', FALSE, TRUE, 0.00, 2),
('not_as_described', 'Item Not as Described', 'Product does not match description or images', TRUE, FALSE, 0.00, 3),
('changed_mind', 'Changed My Mind', 'No longer want the item', FALSE, FALSE, 10.00, 4),
('duplicate_order', 'Duplicate Order', 'Accidentally ordered the same item multiple times', FALSE, TRUE, 0.00, 5),
('shipping_delay', 'Shipping Took Too Long', 'Order arrived later than expected', FALSE, FALSE, 0.00, 6),
('quality_issues', 'Quality Issues', 'Product quality is below expectations', TRUE, FALSE, 0.00, 7),
('other', 'Other Reason', 'Custom reason (requires description)', FALSE, FALSE, 0.00, 8)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Create audit log table for refund actions (for compliance and tracking)
CREATE TABLE IF NOT EXISTS refund_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    refund_request_id INT NOT NULL COMMENT 'Foreign key to refund_requests',
    action VARCHAR(50) NOT NULL COMMENT 'Action performed (created, approved, rejected, etc.)',
    performed_by INT NULL COMMENT 'User ID who performed action (NULL for system)',
    previous_status VARCHAR(50) NULL COMMENT 'Status before action',
    new_status VARCHAR(50) NULL COMMENT 'Status after action',
    notes TEXT NULL COMMENT 'Additional notes about the action',
    ip_address VARCHAR(45) NULL COMMENT 'IP address of actor',
    user_agent TEXT NULL COMMENT 'User agent of actor',
    metadata JSON NULL COMMENT 'Additional metadata',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When action was performed',
    
    CONSTRAINT fk_audit_refund FOREIGN KEY (refund_request_id) REFERENCES refund_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_audit_refund_id (refund_request_id),
    INDEX idx_audit_performed_by (performed_by),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log for all refund-related actions';

-- Create indexes on payments table if they don't exist (for refund queries)
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_payment_status (status),
ADD INDEX IF NOT EXISTS idx_payment_refunded_at (refunded_at);

-- Verification queries to check if migration was successful
-- Run these after executing the migration
-- SELECT COUNT(*) FROM refund_requests; -- Should be 0 (empty table)
-- SELECT COUNT(*) FROM refund_reason_config; -- Should be 8 (default reasons)
-- DESCRIBE refund_requests; -- Should show all columns
-- DESCRIBE order_reviews; -- Should show new refund columns
-- SELECT * FROM refund_summary LIMIT 1; -- Should work (might be empty)

-- Rollback script (if needed) - UNCOMMENT TO ROLLBACK
-- DROP VIEW IF EXISTS refund_summary;
-- DROP TABLE IF EXISTS refund_audit_log;
-- DROP TABLE IF EXISTS refund_reason_config;
-- DROP TABLE IF EXISTS refund_requests;
-- ALTER TABLE order_reviews DROP COLUMN IF EXISTS refund_status;
-- ALTER TABLE order_reviews DROP COLUMN IF EXISTS refunded_amount;
-- ALTER TABLE order_reviews DROP COLUMN IF EXISTS refund_requested_at;
-- ALTER TABLE order_reviews DROP INDEX IF EXISTS idx_order_refund_status;












