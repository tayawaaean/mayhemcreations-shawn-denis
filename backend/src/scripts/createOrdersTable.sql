-- Create orders table for completed orders after payment

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique order ID',
  `orderNumber` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Human-readable order number (e.g., ORD-12345)',
  `userId` INT NOT NULL COMMENT 'User who placed the order',
  `orderReviewId` INT NULL COMMENT 'Reference to the original order_review if applicable',
  
  -- Items
  `items` JSON NOT NULL COMMENT 'Order items with product details and customization',
  
  -- Pricing
  `subtotal` DECIMAL(10, 2) NOT NULL COMMENT 'Subtotal before shipping/tax',
  `shipping` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Shipping cost',
  `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Tax amount',
  `total` DECIMAL(10, 2) NOT NULL COMMENT 'Total order amount',
  
  -- Shipping Address (JSON)
  `shippingAddress` JSON NOT NULL COMMENT 'Shipping address details',
  `billingAddress` JSON NULL COMMENT 'Billing address details (optional)',
  
  -- Payment Details
  `paymentMethod` VARCHAR(50) NOT NULL COMMENT 'Payment method used',
  `paymentStatus` ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending' COMMENT 'Payment processing status',
  `paymentProvider` ENUM('stripe', 'paypal', 'google_pay', 'apple_pay', 'square', 'manual') NOT NULL COMMENT 'Payment gateway provider',
  `paymentIntentId` VARCHAR(255) NULL COMMENT 'Stripe payment intent ID',
  `transactionId` VARCHAR(255) NULL COMMENT 'Payment transaction ID',
  `cardLast4` VARCHAR(4) NULL COMMENT 'Last 4 digits of card',
  `cardBrand` VARCHAR(50) NULL COMMENT 'Card brand (Visa, Mastercard, etc.)',
  
  -- Order Status
  `status` ENUM('pending', 'preparing', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'preparing' COMMENT 'Order fulfillment status',
  
  -- Fulfillment
  `trackingNumber` VARCHAR(255) NULL COMMENT 'Shipping tracking number',
  `shippingCarrier` VARCHAR(100) NULL COMMENT 'Shipping carrier name',
  `shippedAt` DATETIME NULL COMMENT 'When the order was shipped',
  `deliveredAt` DATETIME NULL COMMENT 'When the order was delivered',
  `estimatedDeliveryDate` DATETIME NULL COMMENT 'Estimated delivery date',
  
  -- Notes
  `customerNotes` TEXT NULL COMMENT 'Notes from customer',
  `adminNotes` TEXT NULL COMMENT 'Internal admin notes',
  `internalNotes` TEXT NULL COMMENT 'Internal processing notes',
  `metadata` JSON NULL COMMENT 'Additional metadata',
  
  -- Timestamps
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Order creation timestamp',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  
  -- Indexes
  INDEX `idx_user_id` (`userId`),
  INDEX `idx_order_number` (`orderNumber`),
  INDEX `idx_status` (`status`),
  INDEX `idx_payment_status` (`paymentStatus`),
  INDEX `idx_order_review_id` (`orderReviewId`),
  INDEX `idx_created_at` (`createdAt`),
  INDEX `idx_payment_intent_id` (`paymentIntentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check if orders table exists
SELECT 'Orders table checked/created' as status;

-- Check if there are any orders
SELECT COUNT(*) as total_orders FROM orders;

