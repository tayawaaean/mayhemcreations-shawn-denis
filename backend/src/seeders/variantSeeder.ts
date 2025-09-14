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
  // Embroidered Classic Tee variants - Full size range
  {
    productSlug: 'embroidered-classic-tee',
    name: 'White - XS',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'XS',
    sku: 'TEE-001-WH-XS',
    stock: 15,
    isActive: true
  },
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
    name: 'White - Large',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'L',
    sku: 'TEE-001-WH-L',
    stock: 20,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'White - XL',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'XL',
    sku: 'TEE-001-WH-XL',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Black - XS',
    color: 'Black',
    colorHex: '#000000',
    size: 'XS',
    sku: 'TEE-001-BK-XS',
    stock: 8,
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
    name: 'Black - Large',
    color: 'Black',
    colorHex: '#000000',
    size: 'L',
    sku: 'TEE-001-BK-L',
    stock: 18,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Black - XL',
    color: 'Black',
    colorHex: '#000000',
    size: 'XL',
    sku: 'TEE-001-BK-XL',
    stock: 12,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Navy - Small',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'S',
    sku: 'TEE-001-NV-S',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Navy - Medium',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'M',
    sku: 'TEE-001-NV-M',
    stock: 15,
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
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Red - Medium',
    color: 'Red',
    colorHex: '#dc2626',
    size: 'M',
    sku: 'TEE-001-RD-M',
    stock: 8,
    isActive: true
  },
  {
    productSlug: 'embroidered-classic-tee',
    name: 'Red - Large',
    color: 'Red',
    colorHex: '#dc2626',
    size: 'L',
    sku: 'TEE-001-RD-L',
    stock: 5,
    isActive: true
  },

  // Vintage Wash Tee variants
  {
    productSlug: 'vintage-wash-tee',
    name: 'Vintage White - Small',
    color: 'Vintage White',
    colorHex: '#f8f8f8',
    size: 'S',
    sku: 'TEE-002-VW-S',
    stock: 12,
    isActive: true
  },
  {
    productSlug: 'vintage-wash-tee',
    name: 'Vintage White - Medium',
    color: 'Vintage White',
    colorHex: '#f8f8f8',
    size: 'M',
    sku: 'TEE-002-VW-M',
    stock: 18,
    isActive: true
  },
  {
    productSlug: 'vintage-wash-tee',
    name: 'Vintage White - Large',
    color: 'Vintage White',
    colorHex: '#f8f8f8',
    size: 'L',
    sku: 'TEE-002-VW-L',
    stock: 15,
    isActive: true
  },
  {
    productSlug: 'vintage-wash-tee',
    name: 'Vintage Black - Medium',
    color: 'Vintage Black',
    colorHex: '#1f1f1f',
    size: 'M',
    sku: 'TEE-002-VB-M',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'vintage-wash-tee',
    name: 'Vintage Black - Large',
    color: 'Vintage Black',
    colorHex: '#1f1f1f',
    size: 'L',
    sku: 'TEE-002-VB-L',
    stock: 8,
    isActive: true
  },

  // Long Sleeve Tee variants
  {
    productSlug: 'long-sleeve-tee',
    name: 'White - Small',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'S',
    sku: 'TEE-003-WH-S',
    stock: 20,
    isActive: true
  },
  {
    productSlug: 'long-sleeve-tee',
    name: 'White - Medium',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'M',
    sku: 'TEE-003-WH-M',
    stock: 25,
    isActive: true
  },
  {
    productSlug: 'long-sleeve-tee',
    name: 'White - Large',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'L',
    sku: 'TEE-003-WH-L',
    stock: 18,
    isActive: true
  },
  {
    productSlug: 'long-sleeve-tee',
    name: 'Black - Small',
    color: 'Black',
    colorHex: '#000000',
    size: 'S',
    sku: 'TEE-003-BK-S',
    stock: 15,
    isActive: true
  },
  {
    productSlug: 'long-sleeve-tee',
    name: 'Black - Medium',
    color: 'Black',
    colorHex: '#000000',
    size: 'M',
    sku: 'TEE-003-BK-M',
    stock: 22,
    isActive: true
  },
  {
    productSlug: 'long-sleeve-tee',
    name: 'Black - Large',
    color: 'Black',
    colorHex: '#000000',
    size: 'L',
    sku: 'TEE-003-BK-L',
    stock: 16,
    isActive: true
  },

  // Classic Polo Shirt variants
  {
    productSlug: 'classic-polo-shirt',
    name: 'White - Small',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'S',
    sku: 'POL-001-WH-S',
    stock: 12,
    isActive: true
  },
  {
    productSlug: 'classic-polo-shirt',
    name: 'White - Medium',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'M',
    sku: 'POL-001-WH-M',
    stock: 18,
    isActive: true
  },
  {
    productSlug: 'classic-polo-shirt',
    name: 'White - Large',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'L',
    sku: 'POL-001-WH-L',
    stock: 15,
    isActive: true
  },
  {
    productSlug: 'classic-polo-shirt',
    name: 'Navy - Small',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'S',
    sku: 'POL-001-NV-S',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'classic-polo-shirt',
    name: 'Navy - Medium',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'M',
    sku: 'POL-001-NV-M',
    stock: 16,
    isActive: true
  },
  {
    productSlug: 'classic-polo-shirt',
    name: 'Navy - Large',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'L',
    sku: 'POL-001-NV-L',
    stock: 14,
    isActive: true
  },

  // Classic Hoodie variants
  {
    productSlug: 'classic-hoodie',
    name: 'Gray - Small',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'S',
    sku: 'HOD-001-GR-S',
    stock: 8,
    isActive: true
  },
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
    name: 'Black - Medium',
    color: 'Black',
    colorHex: '#000000',
    size: 'M',
    sku: 'HOD-001-BK-M',
    stock: 12,
    isActive: true
  },
  {
    productSlug: 'classic-hoodie',
    name: 'Black - Large',
    color: 'Black',
    colorHex: '#000000',
    size: 'L',
    sku: 'HOD-001-BK-L',
    stock: 8,
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

  // Zip Hoodie variants
  {
    productSlug: 'zip-hoodie',
    name: 'Black - Small',
    color: 'Black',
    colorHex: '#000000',
    size: 'S',
    sku: 'ZIP-001-BK-S',
    stock: 6,
    isActive: true
  },
  {
    productSlug: 'zip-hoodie',
    name: 'Black - Medium',
    color: 'Black',
    colorHex: '#000000',
    size: 'M',
    sku: 'ZIP-001-BK-M',
    stock: 10,
    isActive: true
  },
  {
    productSlug: 'zip-hoodie',
    name: 'Black - Large',
    color: 'Black',
    colorHex: '#000000',
    size: 'L',
    sku: 'ZIP-001-BK-L',
    stock: 8,
    isActive: true
  },
  {
    productSlug: 'zip-hoodie',
    name: 'Gray - Medium',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'M',
    sku: 'ZIP-001-GR-M',
    stock: 7,
    isActive: true
  },
  {
    productSlug: 'zip-hoodie',
    name: 'Gray - Large',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'L',
    sku: 'ZIP-001-GR-L',
    stock: 5,
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
  },
  {
    productSlug: 'embroidered-cap',
    name: 'Navy - One Size',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'One Size',
    sku: 'CAP-001-NV-OS',
    stock: 25,
    isActive: true
  },
  {
    productSlug: 'embroidered-cap',
    name: 'Red - One Size',
    color: 'Red',
    colorHex: '#dc2626',
    size: 'One Size',
    sku: 'CAP-001-RD-OS',
    stock: 15,
    isActive: true
  },

  // Snapback Cap variants
  {
    productSlug: 'snapback-cap',
    name: 'Black - One Size',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'SNAP-001-BK-OS',
    stock: 30,
    isActive: true
  },
  {
    productSlug: 'snapback-cap',
    name: 'White - One Size',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'One Size',
    sku: 'SNAP-001-WH-OS',
    stock: 20,
    isActive: true
  },
  {
    productSlug: 'snapback-cap',
    name: 'Gray - One Size',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'One Size',
    sku: 'SNAP-001-GR-OS',
    stock: 18,
    isActive: true
  },

  // Trucker Cap variants
  {
    productSlug: 'trucker-cap',
    name: 'Black - One Size',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'TRK-001-BK-OS',
    stock: 22,
    isActive: true
  },
  {
    productSlug: 'trucker-cap',
    name: 'White - One Size',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'One Size',
    sku: 'TRK-001-WH-OS',
    stock: 16,
    isActive: true
  },
  {
    productSlug: 'trucker-cap',
    name: 'Navy - One Size',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'One Size',
    sku: 'TRK-001-NV-OS',
    stock: 12,
    isActive: true
  },

  // Tote Bag variants (no sizing)
  {
    productSlug: 'tote-bag-16x14',
    name: 'Black',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'TOTE-001-BK',
    stock: 25,
    isActive: true
  },
  {
    productSlug: 'tote-bag-16x14',
    name: 'White',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'One Size',
    sku: 'TOTE-001-WH',
    stock: 20,
    isActive: true
  },
  {
    productSlug: 'tote-bag-16x14',
    name: 'Navy',
    color: 'Navy',
    colorHex: '#1e3a8a',
    size: 'One Size',
    sku: 'TOTE-001-NV',
    stock: 15,
    isActive: true
  },

  // Crossbody Bag variants (no sizing)
  {
    productSlug: 'crossbody-bag',
    name: 'Black',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'CROSS-001-BK',
    stock: 18,
    isActive: true
  },
  {
    productSlug: 'crossbody-bag',
    name: 'Brown',
    color: 'Brown',
    colorHex: '#8b4513',
    size: 'One Size',
    sku: 'CROSS-001-BR',
    stock: 12,
    isActive: true
  },
  {
    productSlug: 'crossbody-bag',
    name: 'Gray',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'One Size',
    sku: 'CROSS-001-GR',
    stock: 10,
    isActive: true
  },

  // Drawstring Bag variants (no sizing)
  {
    productSlug: 'drawstring-bag',
    name: 'Black',
    color: 'Black',
    colorHex: '#000000',
    size: 'One Size',
    sku: 'DRAW-001-BK',
    stock: 30,
    isActive: true
  },
  {
    productSlug: 'drawstring-bag',
    name: 'White',
    color: 'White',
    colorHex: '#FFFFFF',
    size: 'One Size',
    sku: 'DRAW-001-WH',
    stock: 25,
    isActive: true
  },
  {
    productSlug: 'drawstring-bag',
    name: 'Gray',
    color: 'Gray',
    colorHex: '#6b7280',
    size: 'One Size',
    sku: 'DRAW-001-GR',
    stock: 20,
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
