import { Sequelize } from 'sequelize';

/**
 * Migration: Fix Products Foreign Key Constraints
 * 
 * Issue: Foreign key constraints reference 'categories' (lowercase) 
 *        but the table is 'Categories' (capital C)
 * 
 * This migration:
 * 1. Drops existing foreign key constraints if they exist
 * 2. Recreates them with the correct table name 'Categories'
 */
export async function up(queryInterface: any, _Sequelize: typeof Sequelize) {
  const sequelize: Sequelize = queryInterface.sequelize;
  
  try {
    console.log('🔧 Fixing products foreign key constraints...');
    
    // Check if constraints exist and get their names
    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND CONSTRAINT_NAME LIKE 'products_ibfk%'
      ORDER BY CONSTRAINT_NAME
    `);
    
    const constraintNames = (constraints as any[]).map((c: any) => c.CONSTRAINT_NAME);
    
    console.log(`Found ${constraintNames.length} existing constraints:`, constraintNames);
    
    // Drop existing constraints
    for (const constraintName of constraintNames) {
      try {
        await sequelize.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`${constraintName}\``);
        console.log(`✅ Dropped constraint: ${constraintName}`);
      } catch (error: any) {
        // Ignore errors if constraint doesn't exist
        if (!error.message?.includes('doesn\'t exist') && !error.message?.includes('Unknown')) {
          console.warn(`⚠️  Could not drop constraint ${constraintName}:`, error.message);
        }
      }
    }
    
    // Recreate constraints with correct table name
    console.log('Creating new constraints with correct table name (Categories)...');
    
    // Constraint for category_id -> Categories.id
    try {
      await sequelize.query(`
        ALTER TABLE \`products\` 
        ADD CONSTRAINT \`products_ibfk_1\` 
        FOREIGN KEY (\`category_id\`) 
        REFERENCES \`Categories\` (\`id\`) 
        ON DELETE NO ACTION 
        ON UPDATE CASCADE
      `);
      console.log('✅ Created constraint products_ibfk_1 (category_id -> Categories.id)');
    } catch (error: any) {
      // Ignore if constraint already exists with correct reference
      if (error.message?.includes('Duplicate key name')) {
        console.log('⚠️  Constraint products_ibfk_1 already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    // Constraint for subcategory_id -> Categories.id
    try {
      await sequelize.query(`
        ALTER TABLE \`products\` 
        ADD CONSTRAINT \`products_ibfk_2\` 
        FOREIGN KEY (\`subcategory_id\`) 
        REFERENCES \`Categories\` (\`id\`) 
        ON DELETE NO ACTION 
        ON UPDATE CASCADE
      `);
      console.log('✅ Created constraint products_ibfk_2 (subcategory_id -> Categories.id)');
    } catch (error: any) {
      // Ignore if constraint already exists with correct reference
      if (error.message?.includes('Duplicate key name')) {
        console.log('⚠️  Constraint products_ibfk_2 already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    // Verify constraints were created correctly
    const [verifyConstraints] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'products'
        AND CONSTRAINT_NAME LIKE 'products_ibfk%'
      ORDER BY CONSTRAINT_NAME
    `);
    
    console.log('✅ Verification - Constraints after migration:');
    (verifyConstraints as any[]).forEach((constraint: any) => {
      console.log(`   ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });
    
    console.log('✅ Foreign key constraint fix completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error fixing foreign key constraints:', error.message);
    throw error;
  }
}

export async function down(queryInterface: any, _Sequelize: typeof Sequelize) {
  const sequelize: Sequelize = queryInterface.sequelize;
  
  try {
    console.log('Reverting foreign key constraint fix...');
    
    // Drop the new constraints
    await sequelize.query('ALTER TABLE `products` DROP FOREIGN KEY IF EXISTS `products_ibfk_1`');
    await sequelize.query('ALTER TABLE `products` DROP FOREIGN KEY IF EXISTS `products_ibfk_2`');
    
    // Note: We don't recreate the old constraints because the models now use 'Categories'
    // The next migration up will recreate them correctly
    
    console.log('✅ Reverted foreign key constraints');
  } catch (error: any) {
    console.error('❌ Error reverting foreign key constraints:', error.message);
    // Don't throw - allow migration to continue even if constraints don't exist
  }
}

