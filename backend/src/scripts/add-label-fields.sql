-- Add shipping label fields to order_review table
-- Run this migration to support ShipEngine label creation

-- Add columns to store label information
ALTER TABLE order_review 
ADD COLUMN IF NOT EXISTS shipping_label_url TEXT,
ADD COLUMN IF NOT EXISTS carrier_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS service_code VARCHAR(100);

-- Add index for tracking lookups (tracking_number column should already exist)
CREATE INDEX IF NOT EXISTS idx_order_review_tracking 
ON order_review(tracking_number);

-- Add index for carrier lookups
CREATE INDEX IF NOT EXISTS idx_order_review_carrier 
ON order_review(carrier_code);

-- Add comments to document the columns
COMMENT ON COLUMN order_review.shipping_label_url IS 'PDF download URL for the shipping label from ShipEngine';
COMMENT ON COLUMN order_review.carrier_code IS 'Carrier code from ShipEngine (e.g., usps, ups, fedex)';
COMMENT ON COLUMN order_review.service_code IS 'Service code from ShipEngine (e.g., usps_priority_mail, ups_ground)';

-- Display migration success
SELECT 'Shipping label fields added successfully!' as status;

-- Show current schema for verification
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_review' 
  AND column_name IN ('shipping_label_url', 'carrier_code', 'service_code', 'tracking_number')
ORDER BY column_name;

