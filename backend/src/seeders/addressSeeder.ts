/**
 * Address Seeder
 * Seeds default addresses for the application
 */

import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

export const clearAddresses = async (): Promise<void> => {
  try {
    logger.info('🧹 Clearing addresses...');
    await sequelize.query('DELETE FROM addresses', { type: QueryTypes.DELETE });
    logger.info('✅ Addresses cleared successfully');
  } catch (error) {
    logger.error('❌ Error clearing addresses:', error);
    throw error;
  }
};

export const seedAddresses = async (): Promise<void> => {
  try {
    logger.info('🌱 Seeding addresses...');

    // Check if addresses already exist
    const existingAddresses = await sequelize.query(
      'SELECT COUNT(*) as count FROM addresses',
      { type: QueryTypes.SELECT }
    ) as any[];

    if (existingAddresses[0].count > 0) {
      logger.info('✅ Addresses already exist, skipping seed');
      return;
    }

    // Default origin address (Mayhem Creation warehouse)
    await sequelize.query(`
      INSERT INTO addresses (
        name, type, is_default, contact_name, company_name, phone, email,
        address_line1, city, state, postal_code, country, residential_indicator, notes,
        created_at, updated_at
      ) VALUES (
        'Mayhem Creation Warehouse',
        'origin',
        true,
        'Mayhem Creation',
        'Mayhem Creation',
        '614-715-4742',
        'info@mayhemcreation.com',
        '128 Persimmon Dr',
        'Newark',
        'OH',
        '43055',
        'US',
        'no',
        'Primary warehouse and fulfillment center',
        NOW(),
        NOW()
      )
    `, { type: QueryTypes.INSERT });

    // Default return address (same as origin for now)
    await sequelize.query(`
      INSERT INTO addresses (
        name, type, is_default, contact_name, company_name, phone, email,
        address_line1, city, state, postal_code, country, residential_indicator, notes,
        created_at, updated_at
      ) VALUES (
        'Mayhem Creation Returns',
        'return',
        true,
        'Mayhem Creation',
        'Mayhem Creation',
        '614-715-4742',
        'returns@mayhemcreation.com',
        '128 Persimmon Dr',
        'Newark',
        'OH',
        '43055',
        'US',
        'no',
        'Return address for customer returns',
        NOW(),
        NOW()
      )
    `, { type: QueryTypes.INSERT });

    // Additional warehouse address (example)
    await sequelize.query(`
      INSERT INTO addresses (
        name, type, is_default, contact_name, company_name, phone, email,
        address_line1, city, state, postal_code, country, residential_indicator, notes,
        created_at, updated_at
      ) VALUES (
        'Secondary Warehouse',
        'warehouse',
        false,
        'Warehouse Manager',
        'Mayhem Creation',
        '614-715-4743',
        'warehouse@mayhemcreation.com',
        '128 Persimmon Dr',
        'Newark',
        'OH',
        '43055',
        'US',
        'no',
        'Secondary storage location',
        NOW(),
        NOW()
      )
    `, { type: QueryTypes.INSERT });

    logger.info('✅ Addresses seeded successfully');
  } catch (error) {
    logger.error('❌ Error seeding addresses:', error);
    throw error;
  }
};

export default seedAddresses;
