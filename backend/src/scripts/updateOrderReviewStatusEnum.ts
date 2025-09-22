import { sequelize } from '../config/database';

async function updateOrderReviewStatusEnum() {
  try {
    console.log('🔄 Updating order_reviews status ENUM...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Update the status column to include new values
    await sequelize.query(`
      ALTER TABLE order_reviews 
      MODIFY COLUMN status ENUM(
        'pending', 
        'approved', 
        'rejected', 
        'needs-changes', 
        'pending-payment', 
        'approved-processing'
      ) NOT NULL DEFAULT 'pending'
    `);
    
    console.log('✅ order_reviews status ENUM updated successfully');
    
    // Verify the change
    const [results] = await sequelize.query('DESCRIBE order_reviews');
    console.log('📋 Current order_reviews table structure:');
    console.table(results);
    
    console.log('🎉 Status ENUM update completed!');
    
  } catch (error) {
    console.error('❌ Error updating status ENUM:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  updateOrderReviewStatusEnum()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { updateOrderReviewStatusEnum };

