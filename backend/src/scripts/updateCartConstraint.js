/**
 * Migration script to update cart table unique constraint
 * This script removes the old unique constraint and adds a new one that includes customization
 */

const { Sequelize } = require('sequelize');

// Database configuration with credentials from dbconfig.txt
const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'mayhem_creation',
  username: 'root',
  password: '123password',
  logging: console.log,
});

async function updateCartConstraint() {
  try {
    console.log('🔄 Starting cart constraint update...');

    // Drop the old unique constraint
    console.log('🗑️  Dropping old unique constraint...');
    await sequelize.query('ALTER TABLE carts DROP INDEX unique_user_product');
    console.log('✅ Old constraint dropped successfully');

    // Add the new unique constraint that includes customization
    console.log('➕ Adding new unique constraint with customization...');
    await sequelize.query('ALTER TABLE carts ADD CONSTRAINT unique_user_product_customization UNIQUE (user_id, product_id, customization)');
    console.log('✅ New constraint added successfully');

    console.log('🎉 Cart constraint update completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Removed: unique_user_product constraint');
    console.log('  - Added: unique_user_product_customization constraint');
    console.log('  - This allows same product with different customizations to be separate cart items');
    
  } catch (error) {
    console.error('❌ Error updating cart constraint:', error);
    
    if (error.message.includes('Duplicate key name')) {
      console.log('ℹ️  The new constraint already exists. This is normal if the migration was run before.');
    } else if (error.message.includes("doesn't exist")) {
      console.log('ℹ️  The old constraint does not exist. This is normal for fresh installations.');
    } else {
      throw error;
    }
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
updateCartConstraint()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
