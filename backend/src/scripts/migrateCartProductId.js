const { sequelize } = require('../config/database');

async function migrateCartProductId() {
  try {
    console.log('🔄 Starting cart product_id migration...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check current column type
    const [results] = await sequelize.query(`
      SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'mayhem_creations' 
      AND TABLE_NAME = 'carts' 
      AND COLUMN_NAME = 'product_id'
    `);
    
    console.log('Current product_id column info:', results[0]);
    
    if (results[0] && results[0].COLUMN_TYPE.includes('int')) {
      console.log('🔄 Converting product_id from INTEGER to VARCHAR...');
      
      // Convert existing integer product_ids to strings first
      await sequelize.query(`
        UPDATE carts 
        SET product_id = CAST(product_id AS CHAR(50))
        WHERE product_id REGEXP '^[0-9]+$'
      `);
      console.log('✅ Converted existing integer product_ids to strings');
      
      // Change column type to VARCHAR
      await sequelize.query(`
        ALTER TABLE carts 
        MODIFY COLUMN product_id VARCHAR(50) NOT NULL
      `);
      console.log('✅ Changed product_id column type to VARCHAR(50)');
    } else {
      console.log('✅ product_id column is already VARCHAR type');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateCartProductId()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateCartProductId;
