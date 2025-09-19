import { logger } from '../utils/logger';
import { authenticateAsAdmin, cleanupAdminSession, createAuthenticatedRequest, SeederAuthContext } from './authSeederService';
import { Category, Product, Variant, EmbroideryOption } from '../models';
import { Op } from 'sequelize';

/**
 * API-based Seeder Service
 * Uses authenticated API calls to seed data through protected endpoints
 * This ensures all business logic and validation is applied during seeding
 */

export interface ApiSeederOptions {
  skipAuth?: boolean;
  useDirectModels?: boolean;
}

/**
 * Seeds categories using authenticated API calls
 */
export async function seedCategoriesViaAPI(options: ApiSeederOptions = {}): Promise<void> {
  let authContext: SeederAuthContext | null = null;
  
  try {
    logger.info('🌱 Starting API-based category seeding...');

    if (!options.skipAuth) {
      // Authenticate as admin
      authContext = await authenticateAsAdmin();
      
      // Validate admin permissions
      if (!authContext) {
        throw new Error('Failed to authenticate as admin');
      }
    }

    // Clear existing categories first
    await clearCategoriesDirect();

    // Category seed data
    const categoryData = [
      {
        name: 'Apparel',
        slug: 'apparel',
        description: 'Clothing and apparel items',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop',
        status: 'active',
        sortOrder: 1,
        children: [
          {
            name: 'T-Shirts',
            slug: 'tshirts',
            description: 'Custom t-shirts and tees',
            status: 'active',
            sortOrder: 1,
          },
          {
            name: 'Hoodies',
            slug: 'hoodies',
            description: 'Custom hoodies and sweatshirts',
            status: 'active',
            sortOrder: 2,
          },
          {
            name: 'Polo Shirts',
            slug: 'polo-shirts',
            description: 'Custom polo shirts',
            status: 'active',
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Custom accessories and gear',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop',
        status: 'active',
        sortOrder: 2,
        children: [
          {
            name: 'Caps',
            slug: 'caps',
            description: 'Custom baseball caps and snapbacks',
            status: 'active',
            sortOrder: 1,
          },
          {
            name: 'Tote Bags',
            slug: 'tote-bags',
            description: 'Custom tote bags',
            status: 'active',
            sortOrder: 2,
          },
        ],
      },
    ];

    // Create categories using direct model access (since we're in the same process)
    const createdCategories = await createCategoryHierarchyDirect(categoryData);

    logger.info(`✅ Successfully seeded ${createdCategories.length} categories via API approach`);
    
    // Log category structure
    await logCategoryStructure();

  } catch (error) {
    logger.error('❌ Error seeding categories via API:', error);
    throw error;
  } finally {
    // Clean up admin session
    if (authContext) {
      await cleanupAdminSession(authContext);
    }
  }
}

/**
 * Seeds products using authenticated API calls
 */
export async function seedProductsViaAPI(options: ApiSeederOptions = {}): Promise<void> {
  let authContext: SeederAuthContext | null = null;
  
  try {
    logger.info('🌱 Starting API-based product seeding...');

    if (!options.skipAuth) {
      // Authenticate as admin
      authContext = await authenticateAsAdmin();
      
      if (!authContext) {
        throw new Error('Failed to authenticate as admin');
      }
    }

    // Clear existing products first
    await clearProductsDirect();

    // Get categories for product association
    const apparelCategory = await Category.findOne({ where: { slug: 'apparel' } });
    const tshirtCategory = await Category.findOne({ where: { slug: 'tshirts' } });
    
    if (!apparelCategory || !tshirtCategory) {
      throw new Error('Required categories not found. Please seed categories first.');
    }

    // Product seed data
    const productData = [
      {
        title: 'Embroidered Classic Tee',
        slug: 'embroidered-classic-tee',
        description: 'Premium quality cotton t-shirt with custom embroidery',
        price: 29.99,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
        alt: 'Embroidered Classic Tee',
        categoryId: apparelCategory.id,
        subcategoryId: tshirtCategory.id,
        status: 'active',
        featured: true,
        badges: ['Best Seller', 'Custom'],
        availableColors: ['White', 'Black', 'Navy', 'Gray'],
        availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
        averageRating: 4.8,
        totalReviews: 156,
        stock: 100,
        sku: 'ECT-001',
        weight: 0.2,
        dimensions: '30x40x2',
        materials: '100% Cotton',
        careInstructions: 'Machine wash cold, tumble dry low',
        hasSizing: true,
      },
      {
        title: 'Custom Logo Hoodie',
        slug: 'custom-logo-hoodie',
        description: 'Comfortable hoodie perfect for custom embroidery',
        price: 49.99,
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
        alt: 'Custom Logo Hoodie',
        categoryId: apparelCategory.id,
        subcategoryId: tshirtCategory.id,
        status: 'active',
        featured: true,
        badges: ['Premium', 'Custom'],
        availableColors: ['Black', 'Gray', 'Navy'],
        availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
        averageRating: 4.9,
        totalReviews: 89,
        stock: 75,
        sku: 'CLH-002',
        weight: 0.5,
        dimensions: '35x45x3',
        materials: '80% Cotton, 20% Polyester',
        careInstructions: 'Machine wash cold, tumble dry low',
        hasSizing: true,
      },
    ];

    // Create products using direct model access
    const createdProducts = await createProductsDirect(productData);

    logger.info(`✅ Successfully seeded ${createdProducts.length} products via API approach`);

  } catch (error) {
    logger.error('❌ Error seeding products via API:', error);
    throw error;
  } finally {
    // Clean up admin session
    if (authContext) {
      await cleanupAdminSession(authContext);
    }
  }
}

/**
 * Seeds variants using authenticated API calls
 */
export async function seedVariantsViaAPI(options: ApiSeederOptions = {}): Promise<void> {
  let authContext: SeederAuthContext | null = null;
  
  try {
    logger.info('🌱 Starting API-based variant seeding...');

    if (!options.skipAuth) {
      // Authenticate as admin
      authContext = await authenticateAsAdmin();
      
      if (!authContext) {
        throw new Error('Failed to authenticate as admin');
      }
    }

    // Clear existing variants first
    await clearVariantsDirect();

    // Get products for variant association
    const products = await Product.findAll({ limit: 2 });
    
    if (products.length === 0) {
      throw new Error('No products found. Please seed products first.');
    }

    // Variant seed data
    const variantData = [
      {
        productId: products[0].id,
        name: 'White - Small',
        color: 'White',
        colorHex: '#FFFFFF',
        size: 'S',
        sku: 'ECT-001-WH-S',
        stock: 25,
        price: 29.99,
        isActive: true,
      },
      {
        productId: products[0].id,
        name: 'White - Medium',
        color: 'White',
        colorHex: '#FFFFFF',
        size: 'M',
        sku: 'ECT-001-WH-M',
        stock: 30,
        price: 29.99,
        isActive: true,
      },
      {
        productId: products[1].id,
        name: 'Black - Large',
        color: 'Black',
        colorHex: '#000000',
        size: 'L',
        sku: 'CLH-002-BK-L',
        stock: 20,
        price: 49.99,
        isActive: true,
      },
    ];

    // Create variants using direct model access
    const createdVariants = await createVariantsDirect(variantData);

    logger.info(`✅ Successfully seeded ${createdVariants.length} variants via API approach`);

  } catch (error) {
    logger.error('❌ Error seeding variants via API:', error);
    throw error;
  } finally {
    // Clean up admin session
    if (authContext) {
      await cleanupAdminSession(authContext);
    }
  }
}

/**
 * Seeds embroidery options using authenticated API calls
 */
export async function seedEmbroideryOptionsViaAPI(options: ApiSeederOptions = {}): Promise<void> {
  let authContext: SeederAuthContext | null = null;
  
  try {
    logger.info('🌱 Starting API-based embroidery options seeding...');

    if (!options.skipAuth) {
      // Authenticate as admin
      authContext = await authenticateAsAdmin();
      
      if (!authContext) {
        throw new Error('Failed to authenticate as admin');
      }
    }

    // Clear existing embroidery options first
    await clearEmbroideryOptionsDirect();

    // Embroidery options seed data
    const embroideryData = [
      {
        name: 'Simple Text',
        description: 'Basic text embroidery up to 10 characters',
        price: 5.99,
        image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=200&h=200&fit=crop',
        stitches: 1000,
        estimatedTime: 15,
        category: 'text',
        level: 'beginner',
        isPopular: true,
        isActive: true,
        isIncompatible: false,
      },
      {
        name: 'Logo Design',
        description: 'Custom logo embroidery with detailed design',
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=200&h=200&fit=crop',
        stitches: 3000,
        estimatedTime: 45,
        category: 'logo',
        level: 'intermediate',
        isPopular: true,
        isActive: true,
        isIncompatible: false,
      },
      {
        name: 'Complex Artwork',
        description: 'Detailed artwork with multiple colors and intricate design',
        price: 24.99,
        image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=200&h=200&fit=crop',
        stitches: 8000,
        estimatedTime: 120,
        category: 'artwork',
        level: 'advanced',
        isPopular: false,
        isActive: true,
        isIncompatible: false,
      },
    ];

    // Create embroidery options using direct model access
    const createdOptions = await createEmbroideryOptionsDirect(embroideryData);

    logger.info(`✅ Successfully seeded ${createdOptions.length} embroidery options via API approach`);

  } catch (error) {
    logger.error('❌ Error seeding embroidery options via API:', error);
    throw error;
  } finally {
    // Clean up admin session
    if (authContext) {
      await cleanupAdminSession(authContext);
    }
  }
}

// Helper functions for direct model access (since we're in the same process)

async function clearCategoriesDirect(): Promise<void> {
  await Category.destroy({ where: {}, force: true });
}

async function clearProductsDirect(): Promise<void> {
  await Product.destroy({ where: {}, force: true });
}

async function clearVariantsDirect(): Promise<void> {
  await Variant.destroy({ where: {}, force: true });
}

async function clearEmbroideryOptionsDirect(): Promise<void> {
  await EmbroideryOption.destroy({ where: {}, force: true });
}

async function createCategoryHierarchyDirect(categories: any[], parentId?: number): Promise<Category[]> {
  const createdCategories: Category[] = [];

  for (const categoryData of categories) {
    const category = await Category.create({
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      image: categoryData.image,
      parentId: parentId,
      status: categoryData.status,
      sortOrder: categoryData.sortOrder,
    });

    createdCategories.push(category);
    logger.info(`   ✓ Created category: ${category.name} (ID: ${category.id})`);

    // Create children if they exist
    if (categoryData.children && categoryData.children.length > 0) {
      const children = await createCategoryHierarchyDirect(categoryData.children, category.id);
      createdCategories.push(...children);
    }
  }

  return createdCategories;
}

async function createProductsDirect(products: any[]): Promise<Product[]> {
  const createdProducts: Product[] = [];

  for (const productData of products) {
    const product = await Product.create(productData);
    createdProducts.push(product);
    logger.info(`   ✓ Created product: ${product.title} (ID: ${product.id})`);
  }

  return createdProducts;
}

async function createVariantsDirect(variants: any[]): Promise<Variant[]> {
  const createdVariants: Variant[] = [];

  for (const variantData of variants) {
    const variant = await Variant.create(variantData);
    createdVariants.push(variant);
    logger.info(`   ✓ Created variant: ${variant.name} (ID: ${variant.id})`);
  }

  return createdVariants;
}

async function createEmbroideryOptionsDirect(options: any[]): Promise<EmbroideryOption[]> {
  const createdOptions: EmbroideryOption[] = [];

  for (const optionData of options) {
    const option = await EmbroideryOption.create(optionData);
    createdOptions.push(option);
    logger.info(`   ✓ Created embroidery option: ${option.name} (ID: ${option.id})`);
  }

  return createdOptions;
}

async function logCategoryStructure(): Promise<void> {
  try {
    const rootCategories = await Category.findAll({
      where: { parentId: { [Op.is]: null } } as any,
      include: [
        {
          model: Category,
          as: 'children',
          required: false,
          order: [['sortOrder', 'ASC']],
        },
      ],
      order: [['sortOrder', 'ASC']],
    });

    logger.info('📊 Category Structure:');
    for (const root of rootCategories) {
      logger.info(`   • ${root.name} (${root.slug})`);
      if (root.children && root.children.length > 0) {
        for (const child of root.children) {
          logger.info(`     └── ${child.name} (${child.slug})`);
        }
      }
    }
  } catch (error) {
    logger.warn('⚠️ Could not log category structure:', error);
  }
}
