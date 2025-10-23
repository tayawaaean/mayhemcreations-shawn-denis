import { logger } from '../utils/logger';
import { syncDatabase } from '../config/database';
import { Role } from '../models/roleModel';
import { User } from '../models/userModel';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { seedEmbroideryOptions } from './embroideryOptionSeeder';
import { seedMaterialCosts, clearMaterialCosts } from './materialCostSeeder';
import { clearProducts } from './productSeeder';
import { clearVariants } from './variantSeeder';
import { seedFAQs, clearFAQs } from './faqSeeder';
import Message from '../models/messageModel';

/**
 * Minimal Seeder
 * Seeds only essential data: 1 admin account, embroidery options, FAQs, and material costing
 * No regular users, no products, no categories
 */

// Create only the admin role and admin user
const createAdminOnly = async (): Promise<void> => {
  try {
    logger.info('🌱 Creating admin role and user...');

    // Create admin role
    const [adminRole, roleCreated] = await Role.findOrCreate({
      where: { name: 'admin' },
      defaults: {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: [
          // User Management permissions
          'users:read', 'users:write', 'users:delete', 'users:manage',
          // Role Management permissions
          'roles:read', 'roles:write', 'roles:delete', 'roles:manage',
          // Product Management permissions
          'products:read', 'products:write', 'products:delete', 'products:manage',
          // Category Management permissions
          'categories:read', 'categories:write', 'categories:delete', 'categories:manage',
          // Order Management permissions
          'orders:read', 'orders:write', 'orders:delete', 'orders:manage',
          // Customer Management permissions
          'customers:read', 'customers:write', 'customers:delete', 'customers:manage',
          // Analytics & Reports permissions
          'analytics:read', 'reports:read', 'reports:write',
          // System Settings permissions
          'settings:read', 'settings:write', 'settings:manage',
          // Content Management permissions
          'content:read', 'content:write', 'content:delete', 'content:manage',
          // Support & Communication permissions
          'support:read', 'support:write', 'support:manage',
          'messages:read', 'messages:write', 'messages:manage',
          // Inventory Management permissions
          'inventory:read', 'inventory:write', 'inventory:manage',
          // Reviews & Feedback permissions
          'reviews:read', 'reviews:write', 'reviews:delete', 'reviews:manage',
          // Embroidery Management permissions
          'embroidery:read', 'embroidery:write', 'embroidery:delete', 'embroidery:manage',
          // FAQ Management permissions
          'faq:read', 'faq:write', 'faq:delete', 'faq:manage'
        ],
        isActive: true,
        isSystem: true
      }
    });

    if (roleCreated) {
      logger.info('✅ Admin role created');
    } else {
      logger.info('✅ Admin role already exists');
    }

    // Check if admin user exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@mayhemcreations.com' }
    });

    if (existingAdmin) {
      logger.info('✅ Admin user already exists');
      // Update role if needed
      if (existingAdmin.roleId !== adminRole.id) {
        await existingAdmin.update({ roleId: adminRole.id });
        logger.info('✅ Admin user role updated');
      }
    } else {
      // Create admin user with hashed password
      const hashedPassword = await bcrypt.hash('admin123!', 12);
      
      const adminUser = await User.create({
        email: 'admin@mayhemcreations.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        phone: '1234567890',
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        roleId: adminRole.id,
      });

      logger.info('✅ Admin user created');
      logger.info(`   • Email: ${adminUser.email}`);
      logger.info(`   • Password: admin123!`);
      logger.info(`   • Role: ${adminRole.displayName}`);
    }

  } catch (error) {
    logger.error('❌ Error creating admin:', error);
    throw error;
  }
};

// Main minimal seeder function
export const runMinimalSeeder = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting minimal database seeding...');
    logger.info('📋 Will seed:');
    logger.info('   • 1 Admin account only');
    logger.info('   • Embroidery options');
    logger.info('   • FAQs');
    logger.info('   • Material costs');
    logger.info('   • NO regular users');
    logger.info('   • NO products');
    logger.info('   • NO categories');

    // Sync database structure
    logger.info('🔄 Syncing database...');
    await syncDatabase(false);
    logger.info('✅ Database synced successfully!');

    // Clear existing data to ensure clean state
    logger.info('🧹 Clearing existing data...');
    await clearVariants(); // Clear variants first to avoid foreign key constraints
    await clearProducts(); // Clear products second to avoid foreign key constraints
    await clearMaterialCosts(); // Clear material costs
    await clearFAQs(); // Clear FAQs
    
    // Clear all non-admin users (customers, sellers, staff)
    logger.info('🧹 Clearing all non-admin users and roles...');
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    if (adminRole) {
      // Delete all users except those with admin role
      await User.destroy({
        where: {
          roleId: {
            [Op.ne]: adminRole.id
          }
        }
      });
      logger.info('✅ Non-admin users cleared!');
      
      // Delete all roles except admin role
      await Role.destroy({
        where: {
          name: {
            [Op.ne]: 'admin'
          }
        }
      });
      logger.info('✅ Non-admin roles (customer, seller, staff) cleared!');
    }
    
    logger.info('✅ Existing data cleared!');

    // Create admin role and user only
    await createAdminOnly();

    // Seed embroidery options
    logger.info('🌱 Seeding embroidery options...');
    await seedEmbroideryOptions(true); // Clear existing first
    logger.info('✅ Embroidery options seeded!');

    // Seed FAQs
    logger.info('🌱 Seeding FAQs...');
    await seedFAQs();
    logger.info('✅ FAQs seeded!');

    // Seed material costs
    logger.info('🌱 Seeding material costs...');
    await seedMaterialCosts();
    logger.info('✅ Material costs seeded!');

    // Clear messages data for clean state
    logger.info('🧹 Clearing chat messages...');
    await Message.destroy({ where: {} });
    logger.info('✅ Chat messages cleared.');

    // Display summary
    await displayMinimalSeedingSummary();

    logger.info('🎉 Minimal database seeding completed successfully!');

  } catch (error) {
    logger.error('❌ Error during minimal seeding process:', error);
    throw error;
  }
};

// Display summary of what was seeded
const displayMinimalSeedingSummary = async (): Promise<void> => {
  try {
    const { EmbroideryOption } = await import('../models/embroideryOptionModel');
    const { MaterialCost } = await import('../models/materialCostModel');
    const Product = (await import('../models/productModel')).default;
    const FAQ = (await import('../models/faqModel')).default;

    const roleCount = await Role.count();
    const userCount = await User.count();
    const embroideryCount = await EmbroideryOption.count();
    const materialCostCount = await MaterialCost.count();
    const productCount = await Product.count();
    const faqCount = await FAQ.count();

    logger.info('📊 Minimal Seeding Summary:');
    logger.info(`   • Roles created: ${roleCount}`);
    logger.info(`   • Users created: ${userCount} (admin only)`);
    logger.info(`   • Embroidery options created: ${embroideryCount}`);
    logger.info(`   • FAQs created: ${faqCount}`);
    logger.info(`   • Material costs created: ${materialCostCount}`);
    logger.info(`   • Products created: ${productCount} (none)`);
    logger.info(`   • Categories created: 0 (none)`);

    // Display admin user details
    const adminUser = await User.findOne({
      where: { email: 'admin@mayhemcreations.com' },
      include: [{ model: Role, as: 'role' }]
    }) as any; // Type assertion for included association

    if (adminUser && adminUser.role) {
      logger.info('👤 Admin Account:');
      logger.info(`   • Email: ${adminUser.email}`);
      logger.info(`   • Password: admin123!`);
      logger.info(`   • Role: ${adminUser.role.displayName}`);
      logger.info(`   • Name: ${adminUser.firstName} ${adminUser.lastName}`);
    }

    // Display FAQs
    const faqs = await FAQ.findAll({
      attributes: ['question', 'category'],
      order: [['sortOrder', 'ASC']],
      limit: 10
    });

    logger.info('❓ FAQs Created:');
    for (const faq of faqs) {
      logger.info(`   • [${faq.category}] ${faq.question}`);
    }

    // Display embroidery option categories
    const embroideryCategories = await EmbroideryOption.findAll({
      attributes: ['category'],
      group: ['category']
    });

    logger.info('🧵 Embroidery Option Categories:');
    for (const emb of embroideryCategories) {
      const count = await EmbroideryOption.count({ where: { category: emb.category } });
      logger.info(`   • ${emb.category}: ${count} options`);
    }

    // Display material costs
    const materials = await MaterialCost.findAll({
      attributes: ['name', 'cost'],
      where: { isActive: true }
    });

    logger.info('💰 Material Costs:');
    for (const material of materials) {
      logger.info(`   • ${material.name}: $${material.cost}`);
    }

  } catch (error) {
    logger.warn('⚠️ Could not display minimal seeding summary:', error);
  }
};

// CLI execution for running this seeder directly
if (require.main === module) {
  runMinimalSeeder()
    .then(() => {
      logger.info('✅ Minimal seeding process completed!');
      process.exit(0);
    })
    .catch((error: unknown) => {
      logger.error('❌ Minimal seeding failed:', error);
      process.exit(1);
    });
}

