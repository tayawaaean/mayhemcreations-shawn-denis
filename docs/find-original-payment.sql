-- Find Original Payment for Order 3
-- Run these queries to find the original successful payment

-- 1. Check ALL payments for order 3, including successful ones
SELECT 
    id,
    order_id,
    order_number,
    provider,
    status,
    transaction_id,
    provider_transaction_id,
    amount,
    gateway_response,
    created_at
FROM payments 
WHERE order_id = 3
ORDER BY created_at ASC;  -- Oldest first to find original payment

-- 2. Check if there's a successful payment with positive amount
SELECT 
    id,
    order_id,
    order_number,
    provider,
    status,
    transaction_id,
    provider_transaction_id,
    amount,
    gateway_response,
    created_at
FROM payments 
WHERE order_id = 3 
  AND status = 'completed'
  AND amount > 0
ORDER BY created_at ASC;

-- 3. Check payments table structure to see all columns
DESCRIBE payments;

-- 4. Check if gateway_response contains payment intent ID
SELECT 
    id,
    provider,
    status,
    provider_transaction_id,
    gateway_response,
    created_at
FROM payments 
WHERE order_id = 3
  AND gateway_response IS NOT NULL
ORDER BY created_at ASC;

-- 5. Check ALL payments for this user to see payment pattern
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
ORDER BY created_at ASC;

