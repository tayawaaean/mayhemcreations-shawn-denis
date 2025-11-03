-- Fix foreign key constraint for products table
-- The constraint references 'categories' (lowercase) but the table is 'Categories' (capital C)

-- Drop the existing constraint
ALTER TABLE `products` DROP FOREIGN KEY `products_ibfk_1`;
ALTER TABLE `products` DROP FOREIGN KEY `products_ibfk_2`;

-- Recreate the constraint with the correct table name
ALTER TABLE `products` 
  ADD CONSTRAINT `products_ibfk_1` 
  FOREIGN KEY (`category_id`) 
  REFERENCES `Categories` (`id`) 
  ON DELETE NO ACTION 
  ON UPDATE CASCADE;

-- Recreate the subcategory constraint if it exists
ALTER TABLE `products` 
  ADD CONSTRAINT `products_ibfk_2` 
  FOREIGN KEY (`subcategory_id`) 
  REFERENCES `Categories` (`id`) 
  ON DELETE NO ACTION 
  ON UPDATE CASCADE;

