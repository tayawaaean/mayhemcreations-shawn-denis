import { Product, Category } from '../models';
import { logger } from '../utils/logger';

export interface ProductSeedData {
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  alt: string;
  categorySlug: string;
  subcategorySlug?: string;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  averageRating?: number;
  totalReviews?: number;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
  hasSizing?: boolean;
}

export const productSeedData: ProductSeedData[] = [
  // Apparel - T-Shirts
  {
    title: 'Embroidered Classic Tee',
    slug: 'embroidered-classic-tee',
    description: '100% cotton tee with premium embroidery on chest.',
    price: 24.0,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center',
    alt: 'Embroidered white tee on table',
    categorySlug: 'apparel',
    subcategorySlug: 'tshirt',
    status: 'active',
    featured: true,
    badges: ['best seller'],
    availableColors: ['White', 'Black', 'Navy', 'Gray', 'Red', 'Forest Green'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.7,
    totalReviews: 3,
    stock: 50,
    sku: 'TEE-001',
    weight: 0.2,
    dimensions: '12x16 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Vintage Wash Tee',
    slug: 'vintage-wash-tee',
    description: 'Soft vintage wash cotton tee with custom embroidery.',
    price: 22.0,
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop&crop=center',
    alt: 'Vintage wash t-shirt',
    categorySlug: 'apparel',
    subcategorySlug: 'tshirt',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Vintage White', 'Vintage Black', 'Vintage Navy', 'Vintage Gray'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.2,
    totalReviews: 1,
    stock: 30,
    sku: 'TEE-002',
    weight: 0.2,
    dimensions: '12x16 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Long Sleeve Tee',
    slug: 'long-sleeve-tee',
    description: 'Comfortable long sleeve tee with embroidered design.',
    price: 28.0,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop&crop=center',
    alt: 'Long sleeve t-shirt',
    categorySlug: 'apparel',
    subcategorySlug: 'long-sleeve-tees',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['White', 'Black', 'Navy', 'Gray', 'Burgundy'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.5,
    totalReviews: 2,
    stock: 25,
    sku: 'TEE-003',
    weight: 0.25,
    dimensions: '12x16 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },

  // Apparel - Polo Shirts
  {
    title: 'Classic Polo Shirt',
    slug: 'classic-polo-shirt',
    description: 'Premium polo shirt with embroidered logo.',
    price: 32.0,
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop&crop=center',
    alt: 'Classic polo shirt',
    categorySlug: 'apparel',
    subcategorySlug: 'poloshirt',
    status: 'active',
    featured: true,
    badges: ['premium'],
    availableColors: ['White', 'Navy', 'Black', 'Forest Green'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.8,
    totalReviews: 4,
    stock: 40,
    sku: 'POLO-001',
    weight: 0.3,
    dimensions: '14x18 inches',
    materials: ['100% Cotton Pique'],
    careInstructions: 'Machine wash cold, hang dry'
  },

  // Apparel - Hoodies
  {
    title: 'Classic Hoodie',
    slug: 'classic-hoodie',
    description: 'Comfortable hoodie with embroidered design.',
    price: 45.0,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center',
    alt: 'Classic hoodie',
    categorySlug: 'apparel',
    subcategorySlug: 'hoodie',
    status: 'active',
    featured: true,
    badges: ['warm', 'cozy'],
    availableColors: ['Black', 'Gray', 'Navy', 'Forest Green'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.6,
    totalReviews: 3,
    stock: 35,
    sku: 'HOOD-001',
    weight: 0.6,
    dimensions: '16x20 inches',
    materials: ['80% Cotton', '20% Polyester'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },
  {
    title: 'Zip Hoodie',
    slug: 'zip-hoodie',
    description: 'Zip-up hoodie with embroidered logo.',
    price: 48.0,
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    alt: 'Zip hoodie',
    categorySlug: 'apparel',
    subcategorySlug: 'zip-hoodies',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'Gray', 'Navy'],
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    averageRating: 4.4,
    totalReviews: 2,
    stock: 20,
    sku: 'ZIP-001',
    weight: 0.7,
    dimensions: '16x20 inches',
    materials: ['80% Cotton', '20% Polyester'],
    careInstructions: 'Machine wash cold, tumble dry low'
  },

  // Accessories - Caps
  {
    title: 'Embroidered Cap',
    slug: 'embroidered-cap',
    description: 'High-profile cap with custom front embroidery.',
    price: 18.0,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    alt: 'Embroidered cap',
    categorySlug: 'accessories',
    subcategorySlug: 'cap',
    status: 'active',
    featured: true,
    badges: ['adjustable'],
    availableColors: ['Black', 'White', 'Navy', 'Gray'],
    availableSizes: ['One Size'],
    averageRating: 4.3,
    totalReviews: 1,
    stock: 60,
    sku: 'CAP-001',
    weight: 0.1,
    dimensions: '8x10 inches',
    materials: ['100% Cotton', 'Mesh Back'],
    careInstructions: 'Hand wash, air dry'
  },
  {
    title: 'Snapback Cap',
    slug: 'snapback-cap',
    description: 'Adjustable snapback with embroidered logo.',
    price: 20.0,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    alt: 'Snapback cap',
    categorySlug: 'accessories',
    subcategorySlug: 'cap',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'White', 'Navy'],
    availableSizes: ['One Size'],
    averageRating: 4.5,
    totalReviews: 2,
    stock: 45,
    sku: 'SNAP-001',
    weight: 0.1,
    dimensions: '8x10 inches',
    materials: ['100% Cotton', 'Snapback Closure'],
    careInstructions: 'Hand wash, air dry'
  },
  {
    title: 'Trucker Cap',
    slug: 'trucker-cap',
    description: 'Classic trucker cap with mesh back and embroidery.',
    price: 19.0,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&crop=center',
    alt: 'Trucker cap',
    categorySlug: 'accessories',
    subcategorySlug: 'trucker-caps',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'White', 'Navy', 'Tan'],
    availableSizes: ['One Size'],
    averageRating: 4.2,
    totalReviews: 1,
    stock: 30,
    sku: 'TRUCK-001',
    weight: 0.1,
    dimensions: '8x10 inches',
    materials: ['100% Cotton Front', 'Mesh Back'],
    careInstructions: 'Hand wash, air dry'
  },

  // Accessories - Bags
  {
    title: 'Tote Bag (16x14)',
    slug: 'tote-bag-16x14',
    description: 'Canvas tote with reinforced handles and embroidery.',
    price: 16.0,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
    alt: 'Canvas tote bag',
    categorySlug: 'accessories',
    subcategorySlug: 'bag',
    status: 'active',
    featured: true,
    badges: ['eco-friendly'],
    availableColors: ['Natural', 'Black', 'Navy', 'Forest Green'],
    availableSizes: ['One Size'],
    averageRating: 4.6,
    totalReviews: 2,
    stock: 25,
    sku: 'TOTE-001',
    weight: 0.3,
    dimensions: '16x14x4 inches',
    materials: ['100% Cotton Canvas'],
    careInstructions: 'Machine wash cold, air dry'
  },
  {
    title: 'Crossbody Bag',
    slug: 'crossbody-bag',
    description: 'Stylish crossbody bag with embroidered design.',
    price: 22.0,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
    alt: 'Crossbody bag',
    categorySlug: 'accessories',
    subcategorySlug: 'crossbody-bags',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'Brown', 'Navy'],
    availableSizes: ['One Size'],
    averageRating: 4.4,
    totalReviews: 1,
    stock: 20,
    sku: 'CROSS-001',
    weight: 0.4,
    dimensions: '10x8x3 inches',
    materials: ['Canvas', 'Leather Straps'],
    careInstructions: 'Spot clean, air dry'
  },
  {
    title: 'Drawstring Bag',
    slug: 'drawstring-bag',
    description: 'Convenient drawstring bag with embroidered logo.',
    price: 12.0,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center',
    alt: 'Drawstring bag',
    categorySlug: 'accessories',
    subcategorySlug: 'drawstring-bags',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Black', 'White', 'Navy', 'Gray'],
    availableSizes: ['One Size'],
    averageRating: 4.0,
    totalReviews: 1,
    stock: 40,
    sku: 'DRAW-001',
    weight: 0.1,
    dimensions: '12x10 inches',
    materials: ['100% Cotton'],
    careInstructions: 'Machine wash cold, air dry'
  },

  // Embroidery - Patches
  {
    title: 'Iron-On Patch',
    slug: 'iron-on-patch',
    description: 'Custom iron-on patch with your design.',
    price: 8.0,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=400&h=400&fit=crop&crop=center',
    alt: 'Iron-on patch',
    categorySlug: 'embroidery',
    subcategorySlug: 'iron-on-patches',
    status: 'active',
    featured: true,
    badges: ['custom'],
    availableColors: ['Various'],
    availableSizes: ['2x2 inches', '3x3 inches', '4x4 inches'],
    averageRating: 4.8,
    totalReviews: 5,
    stock: 100,
    sku: 'PATCH-001',
    weight: 0.05,
    dimensions: '2x2 inches',
    materials: ['Embroidered Thread', 'Iron-On Backing'],
    careInstructions: 'Iron on medium heat, no washing'
  },
  {
    title: 'Sew-On Patch',
    slug: 'sew-on-patch',
    description: 'Custom sew-on patch with your design.',
    price: 10.0,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=400&h=400&fit=crop&crop=center',
    alt: 'Sew-on patch',
    categorySlug: 'embroidery',
    subcategorySlug: 'sew-on-patches',
    status: 'active',
    featured: false,
    badges: [],
    availableColors: ['Various'],
    availableSizes: ['2x2 inches', '3x3 inches', '4x4 inches'],
    averageRating: 4.6,
    totalReviews: 3,
    stock: 80,
    sku: 'SEW-001',
    weight: 0.05,
    dimensions: '2x2 inches',
    materials: ['Embroidered Thread', 'Fabric Backing'],
    careInstructions: 'Sew on securely, machine washable'
  },
  {
    title: 'Patch Pack',
    slug: 'patch-pack',
    description: 'Collection of 5 custom patches.',
    price: 35.0,
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=400&h=400&fit=crop&crop=center',
    alt: 'Patch pack',
    categorySlug: 'embroidery',
    subcategorySlug: 'patch-packs',
    status: 'active',
    featured: true,
    badges: ['bundle', 'value'],
    availableColors: ['Mixed'],
    availableSizes: ['Various'],
    averageRating: 4.7,
    totalReviews: 2,
    stock: 15,
    sku: 'PACK-001',
    weight: 0.25,
    dimensions: 'Various',
    materials: ['Embroidered Thread', 'Mixed Backings'],
    careInstructions: 'See individual patch instructions'
  }
];

export const seedProducts = async (): Promise<void> => {
  try {
    logger.info('🌱 Starting product seeding...');

    // Get all categories to map slugs to IDs
    const categories = await Category.findAll();
    const categoryMap = new Map(categories.map(cat => [cat.slug, cat.id]));

    let createdCount = 0;
    let skippedCount = 0;

    for (const productData of productSeedData) {
      try {
        // Check if product already exists
        const existingProduct = await Product.findOne({
          where: { slug: productData.slug }
        });

        if (existingProduct) {
          logger.info(`⏭️  Product '${productData.title}' already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Find category and subcategory IDs
        const categoryId = categoryMap.get(productData.categorySlug);
        if (!categoryId) {
          logger.warn(`⚠️  Category '${productData.categorySlug}' not found, skipping product '${productData.title}'`);
          skippedCount++;
          continue;
        }

        let subcategoryId: number | undefined;
        if (productData.subcategorySlug) {
          subcategoryId = categoryMap.get(productData.subcategorySlug);
          if (!subcategoryId) {
            logger.warn(`⚠️  Subcategory '${productData.subcategorySlug}' not found for product '${productData.title}'`);
          }
        }

        // Determine if product has sizing based on category
        const hasSizing = productData.categorySlug === 'apparel';

        // Create product
        const product = await Product.create({
          title: productData.title,
          slug: productData.slug,
          description: productData.description,
          price: productData.price,
          image: productData.image,
          alt: productData.alt,
          categoryId,
          subcategoryId,
          status: productData.status,
          featured: productData.featured,
          badges: productData.badges,
          availableColors: productData.availableColors,
          availableSizes: productData.availableSizes,
          averageRating: productData.averageRating,
          totalReviews: productData.totalReviews,
          stock: productData.stock,
          sku: productData.sku,
          weight: productData.weight,
          dimensions: productData.dimensions,
          materials: productData.materials,
          careInstructions: productData.careInstructions,
          hasSizing: hasSizing,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        logger.info(`✅ Created product: ${product.title} (ID: ${product.id})`);
        createdCount++;

      } catch (error) {
        logger.error(`❌ Error creating product '${productData.title}':`, error);
        skippedCount++;
      }
    }

    logger.info(`🎉 Product seeding completed! Created: ${createdCount}, Skipped: ${skippedCount}`);

  } catch (error) {
    logger.error('❌ Error during product seeding:', error);
    throw error;
  }
};

export const clearProducts = async (): Promise<void> => {
  try {
    logger.info('🗑️  Clearing products...');
    
    const deletedCount = await Product.destroy({
      where: {},
      force: true
    });

    logger.info(`✅ Cleared ${deletedCount} products`);
  } catch (error) {
    logger.error('❌ Error clearing products:', error);
    throw error;
  }
};
