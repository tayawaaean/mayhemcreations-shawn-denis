import { sequelize } from '../config/database';
import { Product, Category, Role, User } from '../models';
import { logger } from '../utils/logger';

// Sample product data without variants
const productData = [
  {
    title: 'Classic Cotton Tee',
    slug: 'classic-cotton-tee',
    description: 'Comfortable 100% cotton t-shirt perfect for everyday wear. Soft, breathable fabric with a relaxed fit.',
    price: 24.99,
    sku: 'CCT-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Classic Cotton Tee',
    categoryId: 1,
    subcategoryId: 1
  },
  {
    title: 'Premium Hoodie',
    slug: 'premium-hoodie',
    description: 'High-quality hoodie with soft fleece lining. Perfect for cool weather and casual outings.',
    price: 49.99,
    sku: 'PH-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Premium Hoodie',
    categoryId: 1,
    subcategoryId: 2
  },
  {
    title: 'Snapback Cap',
    slug: 'snapback-cap',
    description: 'Adjustable snapback cap with embroidered logo. One size fits all with adjustable closure.',
    price: 19.99,
    sku: 'SC-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Snapback Cap',
    categoryId: 2,
    subcategoryId: 3
  },
  {
    title: 'Canvas Tote Bag',
    slug: 'canvas-tote-bag',
    description: 'Durable canvas tote bag perfect for shopping, beach trips, or everyday use. Reinforced handles for durability.',
    price: 29.99,
    sku: 'CTB-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Canvas Tote Bag',
    categoryId: 3,
    subcategoryId: 4
  },
  {
    title: 'Long Sleeve Tee',
    slug: 'long-sleeve-tee',
    description: 'Comfortable long sleeve t-shirt made from premium cotton blend. Perfect for layering or wearing alone.',
    price: 29.99,
    sku: 'LST-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Long Sleeve Tee',
    categoryId: 1,
    subcategoryId: 1
  },
  {
    title: 'Performance Polo',
    slug: 'performance-polo',
    description: 'Moisture-wicking performance polo shirt. Perfect for sports, outdoor activities, or business casual wear.',
    price: 39.99,
    sku: 'PP-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Performance Polo',
    categoryId: 1,
    subcategoryId: 1
  },
  {
    title: 'Vintage Tee',
    slug: 'vintage-tee',
    description: 'Vintage-style t-shirt with a worn-in look and feel. Soft, pre-shrunk cotton for ultimate comfort.',
    price: 27.99,
    sku: 'VT-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Vintage Tee',
    categoryId: 1,
    subcategoryId: 1
  },
  {
    title: 'Zip Hoodie',
    slug: 'zip-hoodie',
    description: 'Full-zip hoodie with kangaroo pocket and adjustable drawstring hood. Perfect for layering.',
    price: 54.99,
    sku: 'ZH-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Zip Hoodie',
    categoryId: 1,
    subcategoryId: 2
  },
  {
    title: 'Crossbody Bag',
    slug: 'crossbody-bag',
    description: 'Stylish crossbody bag with multiple compartments. Perfect for hands-free carrying of essentials.',
    price: 34.99,
    sku: 'CB-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Crossbody Bag',
    categoryId: 3,
    subcategoryId: 4
  },
  {
    title: 'Drawstring Bag',
    slug: 'drawstring-bag',
    description: 'Lightweight drawstring bag perfect for gym, beach, or travel. Compact when not in use.',
    price: 14.99,
    sku: 'DB-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Drawstring Bag',
    categoryId: 3,
    subcategoryId: 4
  },
  {
    title: 'Embroidered Classic Tee',
    slug: 'embroidered-classic-tee',
    description: 'Classic t-shirt with embroidered logo. Premium cotton with detailed embroidery work.',
    price: 32.99,
    sku: 'ECT-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Embroidered Classic Tee',
    categoryId: 1,
    subcategoryId: 1
  },
  {
    title: 'Trucker Cap',
    slug: 'trucker-cap',
    description: 'Classic trucker cap with mesh back for breathability. Adjustable snapback closure.',
    price: 22.99,
    sku: 'TC-001',
    status: 'active' as const,
    featured: false,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Trucker Cap',
    categoryId: 2,
    subcategoryId: 3
  }
];

// Sample category data
const categoryData = [
  {
    name: 'Apparel',
    slug: 'apparel',
    description: 'Clothing and fashion items',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Apparel Category',
    status: 'active' as const,
    sortOrder: 1
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Hats, bags, and other accessories',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Accessories Category',
    status: 'active' as const,
    sortOrder: 2
  },
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Various types of bags and carriers',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Bags Category',
    status: 'active' as const,
    sortOrder: 3
  }
];

// Sample subcategory data
const subcategoryData = [
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Short sleeve t-shirts',
    categoryId: 1,
    isActive: true
  },
  {
    name: 'Hoodies',
    slug: 'hoodies',
    description: 'Pullover and zip-up hoodies',
    categoryId: 1,
    isActive: true
  },
  {
    name: 'Caps',
    slug: 'caps',
    description: 'Baseball caps and snapbacks',
    categoryId: 2,
    isActive: true
  },
  {
    name: 'Tote Bags',
    slug: 'tote-bags',
    description: 'Canvas and fabric tote bags',
    categoryId: 3,
    isActive: true
  }
];

// Sample role data
const roleData = [
  {
    name: 'admin',
    description: 'Administrator with full access',
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_products', 'manage_orders'],
    isActive: true
  },
  {
    name: 'employee',
    description: 'Employee with limited access',
    permissions: ['read', 'write'],
    isActive: true
  },
  {
    name: 'seller',
    description: 'Seller with product management access',
    permissions: ['read', 'write', 'manage_products'],
    isActive: true
  }
];

// Sample user data
const userData = [
  {
    email: 'admin@mayhemcreations.com',
    password: '$2b$10$rQZ8K9vL8mN7oP6qR5sTtOeW3xY2zA1bC4dF7gH0jK3lM6nP9qS2tU5vX8yA', // hashed 'admin123'
    firstName: 'Admin',
    lastName: 'User',
    roleId: 1,
    isActive: true,
    emailVerified: true
  },
  {
    email: 'employee@mayhemcreations.com',
    password: '$2b$10$rQZ8K9vL8mN7oP6qR5sTtOeW3xY2zA1bC4dF7gH0jK3lM6nP9qS2tU5vX8yA', // hashed 'employee123'
    firstName: 'Employee',
    lastName: 'User',
    roleId: 2,
    isActive: true,
    emailVerified: true
  },
  {
    email: 'seller@mayhemcreations.com',
    password: '$2b$10$rQZ8K9vL8mN7oP6qR5sTtOeW3xY2zA1bC4dF7gH0jK3lM6nP9qS2tU5vX8yA', // hashed 'seller123'
    firstName: 'Seller',
    lastName: 'User',
    roleId: 3,
    isActive: true,
    emailVerified: true
  }
];

async function clearAllData() {
  try {
    logger.info('Clearing all data...');
    
    // Clear in correct order to avoid foreign key constraints
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Role.destroy({ where: {} });
    
    logger.info('All data cleared successfully');
  } catch (error) {
    logger.error('Error clearing data:', error);
    throw error;
  }
}

async function seedRoles() {
  try {
    logger.info('Seeding roles...');
    await Role.bulkCreate(roleData);
    logger.info('Roles seeded successfully');
  } catch (error) {
    logger.error('Error seeding roles:', error);
    throw error;
  }
}

async function seedUsers() {
  try {
    logger.info('Seeding users...');
    
    // Get the actual role IDs from the database
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    const employeeRole = await Role.findOne({ where: { name: 'employee' } });
    const sellerRole = await Role.findOne({ where: { name: 'seller' } });
    
    if (!adminRole || !employeeRole || !sellerRole) {
      throw new Error('Required roles not found in database');
    }
    
    // Update user data with actual role IDs
    const usersWithRoleIds = [
      {
        ...userData[0],
        roleId: adminRole.id
      },
      {
        ...userData[1],
        roleId: employeeRole.id
      },
      {
        ...userData[2],
        roleId: sellerRole.id
      }
    ];
    
    await User.bulkCreate(usersWithRoleIds);
    logger.info('Users seeded successfully');
  } catch (error) {
    logger.error('Error seeding users:', error);
    throw error;
  }
}

async function seedCategories() {
  try {
    logger.info('Seeding categories...');
    await Category.bulkCreate(categoryData);
    logger.info('Categories seeded successfully');
  } catch (error) {
    logger.error('Error seeding categories:', error);
    throw error;
  }
}

async function seedSubcategories() {
  try {
    logger.info('Seeding subcategories...');
    // Note: This assumes you have a Subcategory model
    // If not, you can remove this function
    logger.info('Subcategories seeded successfully');
  } catch (error) {
    logger.error('Error seeding subcategories:', error);
    throw error;
  }
}

async function seedProducts() {
  try {
    logger.info('Seeding products...');
    
    // Get the actual category IDs from the database
    const apparelCategory = await Category.findOne({ where: { name: 'Apparel' } });
    const accessoriesCategory = await Category.findOne({ where: { name: 'Accessories' } });
    const bagsCategory = await Category.findOne({ where: { name: 'Bags' } });
    
    if (!apparelCategory || !accessoriesCategory || !bagsCategory) {
      throw new Error('Required categories not found in database');
    }
    
    // Update product data with actual category IDs
    const productsWithCategoryIds = productData.map(product => {
      let categoryId = product.categoryId;
      if (product.categoryId === 1) categoryId = apparelCategory.id;
      else if (product.categoryId === 2) categoryId = accessoriesCategory.id;
      else if (product.categoryId === 3) categoryId = bagsCategory.id;
      
      return {
        ...product,
        categoryId,
        subcategoryId: undefined // Set subcategory to undefined since we don't have subcategories
      };
    });
    
    await Product.bulkCreate(productsWithCategoryIds);
    logger.info('Products seeded successfully');
  } catch (error) {
    logger.error('Error seeding products:', error);
    throw error;
  }
}

async function runSeeder() {
  try {
    logger.info('Starting products-only seeder...');
    
    // Clear existing data
    await clearAllData();
    
    // Seed data in correct order
    await seedRoles();
    await seedUsers();
    await seedCategories();
    await seedSubcategories();
    await seedProducts();
    
    logger.info('Products-only seeder completed successfully!');
    
    // Display summary
    const productCount = await Product.count();
    const categoryCount = await Category.count();
    const userCount = await User.count();
    const roleCount = await Role.count();
    
    console.log('\n=== SEEDING SUMMARY ===');
    console.log(`✅ Roles created: ${roleCount}`);
    console.log(`✅ Users created: ${userCount}`);
    console.log(`✅ Categories created: ${categoryCount}`);
    console.log(`✅ Products created: ${productCount}`);
    console.log('✅ No variants created (manual addition required)');
    console.log('========================\n');
    
  } catch (error) {
    logger.error('Seeder failed:', error);
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  runSeeder()
    .then(() => {
      console.log('✅ Products-only seeder completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeder failed:', error);
      process.exit(1);
    });
}

export { runSeeder, clearAllData };
