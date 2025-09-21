-- Clear pending orders table
-- Run this script in your MySQL/MariaDB database management tool

USE mayhem_creations;

-- Clear all order reviews
DELETE FROM order_reviews;

-- Reset cart items that are marked as submitted back to pending
UPDATE carts 
SET review_status = 'pending', 
    order_review_id = NULL 
WHERE review_status = 'submitted';

-- Show confirmation
SELECT 'Pending orders table cleared successfully!' as message;
SELECT COUNT(*) as remaining_order_reviews FROM order_reviews;
SELECT COUNT(*) as pending_cart_items FROM carts WHERE review_status = 'pending';
