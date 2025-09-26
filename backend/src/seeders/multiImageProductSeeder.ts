import { Op } from 'sequelize';
import Product from '../models/productModel';
import { logger } from '../utils/logger';

/**
 * Seed products with multiple images. If a product already has an images array,
 * it will be left as-is. Otherwise we will create a minimal array using the
 * existing single `image` as the first (and primary) entry.
 */
export async function seedMultiImageProducts(): Promise<void> {
  try {
    logger.info('🌱 Seeding multi-image data for products...');

    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { images: { [Op.is]: null } as any },
          { images: [] as any },
        ],
      } as any,
    });

    let updatedCount = 0;
    for (const product of products) {
      const singleImage = product.image;
      const newImages = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (singleImage ? [singleImage] : []);

      await product.update({
        images: newImages,
        primaryImageIndex: 0,
      });
      updatedCount += 1;
    }

    logger.info(`✅ Multi-image seeding complete. Updated ${updatedCount} products.`);
  } catch (error) {
    logger.error('❌ Error seeding multi-image products:', error);
    throw error;
  }
}

/**
 * Clear multi-image related fields on products (images, primaryImageIndex).
 */
export async function clearMultiImageProducts(): Promise<void> {
  try {
    logger.info('🧹 Clearing multi-image fields on products...');
    const [affected] = await Product.update(
      { images: [], primaryImageIndex: 0 },
      { where: {} }
    );
    logger.info(`✅ Cleared multi-image fields on ${affected} products.`);
  } catch (error) {
    logger.error('❌ Error clearing multi-image products:', error);
    throw error;
  }
}

/**
 * Update existing products so that the legacy `image` becomes the first entry
 * in the `images` array when `images` is not already populated.
 */
export async function updateExistingProductsWithImages(): Promise<void> {
  try {
    logger.info('🔄 Updating existing products with image arrays...');
    const products = await Product.findAll();

    let updatedCount = 0;
    for (const product of products) {
      const hasImages = Array.isArray(product.images) && product.images.length > 0;
      if (hasImages) continue;

      const singleImage = product.image;
      const nextImages = singleImage ? [singleImage] : [];

      await product.update({
        images: nextImages,
        primaryImageIndex: 0,
      });
      updatedCount += 1;
    }

    logger.info(`✅ Updated ${updatedCount} products with image arrays.`);
  } catch (error) {
    logger.error('❌ Error updating existing products with images:', error);
    throw error;
  }
}


