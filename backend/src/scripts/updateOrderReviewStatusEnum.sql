-- Update order_reviews table to include new status values
-- This script adds 'pending-payment' and 'approved-processing' to the status ENUM

-- First, modify the status column to include the new values
ALTER TABLE order_reviews 
MODIFY COLUMN status ENUM(
  'pending', 
  'approved', 
  'rejected', 
  'needs-changes', 
  'pending-payment', 
  'approved-processing'
) NOT NULL DEFAULT 'pending';

-- Verify the change
DESCRIBE order_reviews;
