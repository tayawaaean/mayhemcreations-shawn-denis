import { sequelize } from '../config/database';
import { Cart } from '../models/cartModel';

async function alterCartTable() {
  try {
    console.log('🔄 Altering cart table to support string product_id...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Use Sequelize sync with alter to modify the table
    await Cart.sync({ alter: true });
    console.log('✅ Cart table altered successfully');
    
    console.log('🎉 Table alteration completed!');
    
  } catch (error) {
    console.error('❌ Table alteration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  alterCartTable()
    .then(() => {
      console.log('✅ Table alteration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Table alteration script failed:', error);
      process.exit(1);
    });
}

export default alterCartTable;
