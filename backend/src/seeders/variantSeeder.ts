import { Variant, Product } from '../models';
import { logger } from '../utils/logger';

export interface VariantSeedData {
  productSlug: string;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock: number;
  price?: number;
  image?: string;
  weight?: number;
  dimensions?: string;
  isActive?: boolean;
}

export const variantSeedData: VariantSeedData[] = [
  // Embroidered Classic Tee variants
  {
    productSlug: 'embroidered-classic-tee',
    name: 'White - Small',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'S',
    sku: 'TEE-001-WH-S',
    stock: 25,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'White - Medium',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'M',
    sku: 'TEE-001-WH-M',
    stock: 30,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Black - Small',
    color: 'Black',
    colorHex: '#000000',
    size: 'S',
    sku: 'TEE-001-BK-S',
    stock: 15,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Black - Medium',
    color: 'Black',
    colorHex: '#000000',
    size: 'M',
    sku: 'TEE-001-BK-M',
    stock: 20,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Navy - Large',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'L',
    sku: 'TEE-001-NV-L',
    stock: 0, // Out of stock
    isActive: true
  },
  // Classic Hoodie variants
  {
    productSlug: 'classic-hoodie',
    name: 'Gray - Medium',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'M',
    sku: 'HOD-001-GR-M',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'classic-hoodie',
    name: 'Gray - Large',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'L',
    sku: 'HOD-001-GR-L',
    stock: 5, // Low stock
    isActive: true
  },
  {
    productSlug: 'classic-hoodie',
    name: 'Black - XL',
    color: 'Black',
    colorHex: '#000000',
    size: 'XL',
    sku: 'HOD-001-BK-XL',
    stock: 0, // Out of stock
    isActive: true
  },
  // Embroidered Cap variants
  {
    productSlug: 'embroidered-cap',
    name: 'Black - One Size',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'CAP-001-BK-OS',
    stock: 50,
    isActive: true
  },
  {
    productSlug: 'embroidered-cap',
    name: 'White - One Size',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'One Size',
    sku: 'CAP-001-WH-OS',
    stock: 0, // Out of stock
    isActive: true
  }
];

export async function clearVariants(): Promise<void> {
  try {
    logger.info('🧹 Clearing variants...');
    await Variant.destroy({ where: {} });
    logger.info('✅ Variants cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing variants:', error);
    throw error;
  }
}

export async function seedVariants(): Promise<void> {
  try {
    logger.info('🌱 Starting variant seeding...');

    // Check if there's any variant data to seed
    if (variantSeedData.length === 0) {
      logger.info('📝 No variant data to seed - variants will be added manually through the UI');
      return;
    }

    // Clear existing variants first
    await clearVariants();

    // Get all products to map slugs to IDs
    const products = await Product.findAll({
      attributes: ['id', 'slug'],
    });

    const productSlugToId = new Map(
      products.map(product => [product.slug, product.id])
    );

    // Create variants
    const createdVariants = [];
    
    for (const variantData of variantSeedData) {
      const productId = productSlugToId.get(variantData.productSlug);
      
      if (!productId) {
        logger.warn(`⚠️ Product with slug "${variantData.productSlug}" not found, skipping variant "${variantData.name}"`);
        continue;
      }

      const variant = await Variant.create({
        productId,
        name: variantData.name,
        color: variantData.color,
        colorHex: variantData.colorHex,
        size: variantData.size,
        sku: variantData.sku,
        stock: variantData.stock,
        price: variantData.price,
        image: variantData.image,
        weight: variantData.weight,
        dimensions: variantData.dimensions,
        isActive: variantData.isActive ?? true,
      });

      createdVariants.push(variant);
      logger.info(`✅ Created variant: ${variant.name} (SKU: ${variant.sku}) for product ID: ${productId}`);
    }

    logger.info(`🎉 Variant seeding completed! Created ${createdVariants.length} variants.`);

  } catch (error) {
    logger.error('❌ Error seeding variants:', error);
    throw error;
  }
}

export async function getVariantStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
}> {
  try {
    const total = await Variant.count();
    const active = await Variant.count({ where: { isActive: true } });
    const inactive = await Variant.count({ where: { isActive: false } });
    
    const variants = await Variant.findAll({
      attributes: ['stock'],
    });
    
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    const lowStock = variants.filter(variant => variant.stock > 0 && variant.stock <= 10).length;
    const outOfStock = variants.filter(variant => variant.stock === 0).length;

    return {
      total,
      active,
      inactive,
      totalStock,
      lowStock,
      outOfStock,
    };
  } catch (error) {
    logger.error('❌ Error getting variant stats:', error);
    throw error;
  }
}
