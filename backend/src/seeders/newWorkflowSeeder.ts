import { logger } from '../utils/logger';
import { syncDatabase } from '../config/database';
import { seedRoles, clearRoles } from './roleSeeder';
import { seedUsers, clearUsers } from './userSeeder';
import { seedCategories, clearCategories } from './categorySeeder';
import { seedVariants, clearVariants } from './variantSeeder';
import { Product, Category, Variant } from '../models';

/**
 * New Workflow Seeder
 * This seeder reflects the new workflow:
 * 1. Categories - manage categories and subcategories
 * 2. Products - add products without stock management
 * 3. Inventory - manage stock and variants
 */

export interface ProductSeedData {
  title: string;
  slug: string;
  description: string;
  price: number;
  image?: string;
  alt: string;
  categorySlug: string;
  subcategorySlug?: string;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
}

// Products without stock - stock will be managed in inventory section
export const newWorkflowProductSeedData: ProductSeedData[] = [
  {
    title: 'Embroidered Classic Tee',
    slug: 'embroidered-classic-tee',
    description: 'Premium cotton t-shirt with custom embroidered design. Perfect for everyday wear with a touch of personality.',
    price: 24.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Embroidered Classic Tee',
    categorySlug: 'apparel',
    subcategorySlug: 't-shirts',
    status: 'active',
    featured: true,
    badges: ['bestseller'],
    availableColors: ['White', 'Black', 'Navy'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'TEE-001',
    weight: 0.2,
    dimensions: '12x16 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Premium Hoodie',
    slug: 'premium-hoodie',
    description: 'Ultra-soft fleece hoodie with kangaroo pocket and adjustable drawstring. Perfect for layering.',
    price: 45.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Premium Hoodie',
    categorySlug: 'apparel',
    subcategorySlug: 'hoodies',
    status: 'active',
    featured: true,
    badges: ['new'],
    availableColors: ['Gray', 'Black', 'Navy'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'HOD-001',
    weight: 0.8,
    dimensions: '14x18 inches',
    materials: ['80% Cotton', '20% Polyester'],
    careInstructions: 'Machine wash cold, hang dry'
  },
  {
    title: 'Snapback Cap',
    slug: 'snapback-cap',
    description: 'Classic snapback cap with embroidered logo. Adjustable fit for all-day comfort.',
    price: 18.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Snapback Cap',
    categorySlug: 'accessories',
    subcategorySlug: 'caps',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'White', 'Red', 'Navy'],
    availableSizes: ['One Size'],
    sku: 'CAP-001',
    weight: 0.1,
    dimensions: '8x8 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Hand wash only'
  },
  {
    title: 'Canvas Tote Bag',
    slug: 'canvas-tote-bag',
    description: 'Durable canvas tote bag perfect for shopping or daily use. Features reinforced handles.',
    price: 15.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Canvas Tote Bag',
    categorySlug: 'accessories',
    subcategorySlug: 'tote-bags',
    status: 'active',
    featured: false,
    badges: ['eco-friendly'],
    availableColors: ['Natural', 'Black', 'Gray'],
    availableSizes: ['One Size'],
    sku: 'TOT-001',
    weight: 0.3,
    dimensions: '15x16 inches',
    materials: ['100% Canvas'],
    careInstructions: 'Machine wash cold, air dry'
  },
  {
    title: 'Long Sleeve Tee',
    slug: 'long-sleeve-tee',
    description: 'Comfortable long sleeve t-shirt with ribbed cuffs. Perfect for cooler weather.',
    price: 28.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Long Sleeve Tee',
    categorySlug: 'apparel',
    subcategorySlug: 'long-sleeve-tees',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['White', 'Black', 'Navy'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'LST-001',
    weight: 0.3,
    dimensions: '12x18 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Performance Polo',
    slug: 'performance-polo',
    description: 'Moisture-wicking polo shirt perfect for active wear. Features UV protection.',
    price: 35.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Performance Polo',
    categorySlug: 'apparel',
    subcategorySlug: 'polo-shirts',
    status: 'active',
    featured: true,
    badges: ['performance'],
    availableColors: ['White', 'Navy', 'Gray'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'POL-001',
    weight: 0.4,
    dimensions: '13x17 inches',
    materials: ['95% Polyester', '5% Spandex'],
    careInstructions: 'Machine wash cold, hang dry'
  },
  {
    title: 'Vintage Tee',
    slug: 'vintage-tee',
    description: 'Soft vintage-style t-shirt with distressed finish. Retro comfort meets modern style.',
    price: 22.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Vintage Tee',
    categorySlug: 'apparel',
    subcategorySlug: 'vintage-tees',
    status: 'active',
    featured: false,
    badges: ['vintage'],
    availableColors: ['Vintage White', 'Vintage Black'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'VIN-001',
    weight: 0.2,
    dimensions: '12x16 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Zip Hoodie',
    slug: 'zip-hoodie',
    description: 'Full-zip hoodie with dual pockets and metal zipper. Perfect for layering.',
    price: 48.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Zip Hoodie',
    categorySlug: 'apparel',
    subcategorySlug: 'zip-hoodies',
    status: 'active',
    featured: true,
    badges: ['premium'],
    availableColors: ['Gray', 'Black', 'Navy'],
    availableSizes: ['S', 'M', 'L', 'XL'],
    sku: 'ZIP-001',
    weight: 0.9,
    dimensions: '14x18 inches',
    materials: ['80% Cotton', '20% Polyester'],
    careInstructions: 'Machine wash cold, hang dry'
  },
  {
    title: 'Crossbody Bag',
    slug: 'crossbody-bag',
    description: 'Compact crossbody bag with adjustable strap. Perfect for hands-free convenience.',
    price: 25.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Crossbody Bag',
    categorySlug: 'accessories',
    subcategorySlug: 'crossbody-bags',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'Brown', 'Gray'],
    availableSizes: ['One Size'],
    sku: 'CBB-001',
    weight: 0.4,
    dimensions: '10x12 inches',
    materials: ['Faux Leather'],
    careInstructions: 'Wipe clean with damp cloth'
  },
  {
    title: 'Drawstring Bag',
    slug: 'drawstring-bag',
    description: 'Lightweight drawstring bag perfect for gym or travel. Water-resistant material.',
    price: 12.0,
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    alt: 'Drawstring Bag',
    categorySlug: 'accessories',
    subcategorySlug: 'drawstring-bags',
    status: 'active',
    featured: false,
    badges: ['water-resistant'],
    availableColors: ['Black', 'White', 'Gray'],
    availableSizes: ['One Size'],
    sku: 'DSB-001',
    weight: 0.2,
    dimensions: '12x14 inches',
    materials: ['Polyester'],
    careInstructions: 'Machine wash cold, air dry'
  }
];

export async function clearNewWorkflowProducts(): Promise<void> {
  try {
    logger.info('🧹 Clearing products (new workflow)...');
    
    // Clear in order: variants -> products
    await clearVariants();
    await Product.destroy({ where: {} });
    
    logger.info('✅ Products cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing products:', error);
    throw error;
  }
}

export async function seedNewWorkflowProducts(): Promise<void> {
  try {
    logger.info('🌱 Starting new workflow product seeding...');

    // Clear existing products first
    await clearNewWorkflowProducts();

    // Get all categories to map slugs to IDs
    const categories = await Category.findAll({
      attributes: ['id', 'slug'],
    });

    const categorySlugToId = new Map(
      categories.map(category => [category.slug, category.id])
    );

    // Create products without stock
    const createdProducts = [];
    
    for (const productData of newWorkflowProductSeedData) {
      const categoryId = categorySlugToId.get(productData.categorySlug);
      const subcategoryId = productData.subcategorySlug 
        ? categorySlugToId.get(productData.subcategorySlug)
        : null;
      
      if (!categoryId) {
        logger.warn(`⚠️ Category "${productData.categorySlug}" not found, skipping product "${productData.title}"`);
        continue;
      }

      const product = await Product.create({
        title: productData.title,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        image: productData.image || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        alt: productData.alt,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        status: productData.status,
        featured: productData.featured,
        badges: productData.badges,
        availableColors: productData.availableColors,
        availableSizes: productData.availableSizes,
        // Note: No stock field - will be managed in inventory section
        sku: productData.sku,
        weight: productData.weight,
        dimensions: productData.dimensions,
        materials: productData.materials,
        careInstructions: productData.careInstructions,
      });

      createdProducts.push(product);
      logger.info(`✅ Created product: ${product.title} (ID: ${product.id}) - No stock set`);
    }

    logger.info(`🎉 New workflow product seeding completed! Created ${createdProducts.length} products without stock.`);
    logger.info(`📝 Note: Stock and variants will be managed in the Inventory section.`);

  } catch (error) {
    logger.error('❌ Error seeding new workflow products:', error);
    throw error;
  }
}

/**
 * Complete new workflow seeding
 * This runs the complete seeding process for the new workflow
 */
export async function runNewWorkflowSeeding(): Promise<void> {
  try {
    logger.info('🚀 Starting new workflow database seeding...');
    
    // Sync database
    logger.info('🔄 Syncing database...');
    await syncDatabase();
    logger.info('✅ Database synced successfully!');

    // Seed in order: roles -> users -> categories -> products (no stock)
    logger.info('🌱 Seeding roles...');
    await seedRoles();

    logger.info('🌱 Seeding users...');
    await seedUsers();

    logger.info('🌱 Seeding categories...');
    await seedCategories();

    logger.info('🌱 Seeding products (no stock)...');
    await seedNewWorkflowProducts();

    logger.info('🎉 New workflow seeding completed successfully!');
    logger.info('📋 Summary:');
    logger.info('   • Products created without stock');
    logger.info('   • Use Categories section to manage categories');
    logger.info('   • Use Products section to add/edit products');
    logger.info('   • Use Inventory section to manage stock and variants');

  } catch (error) {
    logger.error('❌ Error during new workflow seeding:', error);
    throw error;
  }
}

// CLI support
if (require.main === module) {
  runNewWorkflowSeeding()
    .then(() => {
      logger.info('✅ New workflow seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ New workflow seeding failed:', error);
      process.exit(1);
    });
}
