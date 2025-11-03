-- Fix foreign key constraint for products table
-- The constraint references 'categories' (lowercase) but the table is 'Categories' (capital C)

-- Enable verbose output
SELECT 'Starting foreign key constraint fix...' AS status;

-- Show current constraints (for debugging)
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  REFERENCED_TABLE_NAME
FROM 
  information_schema.KEY_COLUMN_USAGE
WHERE 
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products'
  AND CONSTRAINT_NAME LIKE 'products_ibfk%';

SELECT 'Dropping existing constraints...' AS status;

-- Drop the existing constraints
-- Note: These commands will fail if constraints don't exist, which is OK
-- We'll suppress the errors by checking first

SET @constraint1 = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND CONSTRAINT_NAME = 'products_ibfk_1'
  LIMIT 1
);

SET @constraint2 = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND CONSTRAINT_NAME = 'products_ibfk_2'
  LIMIT 1
);

-- Drop constraint 1 if it exists
SET @drop1 = IF(@constraint1 IS NOT NULL, 
  CONCAT('ALTER TABLE `products` DROP FOREIGN KEY `', @constraint1, '`'),
  'SELECT "Constraint products_ibfk_1 does not exist, skipping..." AS status'
);
PREPARE stmt1 FROM @drop1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Drop constraint 2 if it exists  
SET @drop2 = IF(@constraint2 IS NOT NULL,
  CONCAT('ALTER TABLE `products` DROP FOREIGN KEY `', @constraint2, '`'),
  'SELECT "Constraint products_ibfk_2 does not exist, skipping..." AS status'
);
PREPARE stmt2 FROM @drop2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SELECT 'Creating new constraints with correct table name (Categories)...' AS status;

-- Recreate the constraint with the correct table name
ALTER TABLE `products` 
  ADD CONSTRAINT `products_ibfk_1` 
  FOREIGN KEY (`category_id`) 
  REFERENCES `Categories` (`id`) 
  ON DELETE NO ACTION 
  ON UPDATE CASCADE;

SELECT 'Created constraint products_ibfk_1 (category_id -> Categories.id)' AS status;

-- Recreate the subcategory constraint
ALTER TABLE `products` 
  ADD CONSTRAINT `products_ibfk_2` 
  FOREIGN KEY (`subcategory_id`) 
  REFERENCES `Categories` (`id`) 
  ON DELETE NO ACTION 
  ON UPDATE CASCADE;

SELECT 'Created constraint products_ibfk_2 (subcategory_id -> Categories.id)' AS status;

-- Verify the constraints were created correctly
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM 
  information_schema.KEY_COLUMN_USAGE
WHERE 
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products'
  AND CONSTRAINT_NAME LIKE 'products_ibfk%'
ORDER BY CONSTRAINT_NAME;

SELECT 'Foreign key constraint fix completed successfully!' AS status;
