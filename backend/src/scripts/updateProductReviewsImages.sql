-- Update product_reviews table to support large base64 images
-- Change images column from TEXT to LONGTEXT

ALTER TABLE product_reviews 
MODIFY COLUMN images LONGTEXT 
COMMENT 'JSON array of review image URLs (base64)';

