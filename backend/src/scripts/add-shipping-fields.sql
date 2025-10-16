-- Add shipping fields to order_reviews table
-- This migration adds shipping address, shipping method, and customer notes

-- Add shipping address field (JSON)
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add billing address field (JSON)
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add shipping method field (JSON) - stores selected carrier and service details
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS shipping_method JSONB;

-- Add customer notes field
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Add shipping carrier field for quick filtering
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50);

-- Add estimated delivery date
ALTER TABLE order_reviews 
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Create index for faster lookups by shipping carrier
CREATE INDEX IF NOT EXISTS idx_order_reviews_shipping_carrier 
ON order_reviews(shipping_carrier);

-- Verify columns were added
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_reviews' 
AND column_name IN ('shipping_address', 'shipping_method', 'customer_notes', 'shipping_carrier', 'billing_address', 'estimated_delivery_date')
ORDER BY column_name;

