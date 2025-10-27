/**
 * Run Address Seeder
 * Script to seed the database with default addresses
 */

import { sequelize } from '../config/database';
import { seedAddresses } from '../seeders/addressSeeder';

const runSeeder = async () => {
  try {
    console.log('🌱 Starting address seeder...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Run the seeder
    await seedAddresses();
    
    console.log('✅ Address seeder completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Address seeder failed:', error);
    process.exit(1);
  }
};

runSeeder();
