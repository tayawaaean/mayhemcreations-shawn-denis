-- Fix Refund Request - Find Payment Information
-- Run these queries in your MariaDB console

-- 1. Check the order details for order_id 3
SELECT 
    id,
    order_number,
    user_id,
    total,
    payment_intent_id,
    transaction_id,
    payment_method,
    payment_status,
    status
FROM order_reviews 
WHERE id = 3;

-- 2. Check if there are any payment records for order_id 3
SELECT 
    id,
    order_id,
    order_number,
    provider,
    status,
    transaction_id,
    provider_transaction_id,
    amount,
    created_at
FROM payments 
WHERE order_id = 3
ORDER BY id DESC;

-- 3. Check all payments for this user (user_id 56)
SELECT 
    id,
    order_id,
    order_number,
    provider,
    status,
    transaction_id,
    provider_transaction_id,
    amount,
    created_at
FROM payments 
WHERE order_id IN (
    SELECT id FROM order_reviews WHERE user_id = 56
)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Update the refund request with payment provider if found
-- First, let's see what payment info exists for order 3
-- Then we can update the refund request accordingly

-- If you find a Stripe payment intent ID in order_reviews:
-- UPDATE refund_requests 
-- SET payment_provider = 'stripe' 
-- WHERE id = 1;

-- If you find a PayPal transaction ID:
-- UPDATE refund_requests 
-- SET payment_provider = 'paypal' 
-- WHERE id = 1;

-- If you find a payment record:
-- UPDATE refund_requests 
-- SET payment_id = [payment_id], 
--     payment_provider = [provider] 
-- WHERE id = 1;

