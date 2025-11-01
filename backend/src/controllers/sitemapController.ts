/**
 * Sitemap Controller
 * Generates XML sitemap dynamically from products and categories
 */

import { Request, Response } from 'express';
import Product from '../models/productModel';
import { Category } from '../models/categoryModel';
import { logger } from '../utils/logger';

/**
 * Generate XML sitemap dynamically
 * @route GET /api/v1/sitemap.xml
 * @access Public
 */
export const generateSitemap = async (req: Request, res: Response): Promise<void> => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://mayhemcreation.com';
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Fetch all active products
    // Note: We don't restrict attributes so that Sequelize automatically includes timestamps
    const products = await Product.findAll({
      where: {
        status: 'active'
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      attributes: {
        exclude: ['description', 'image', 'images', 'primaryImageIndex', 'alt', 'categoryId', 'subcategoryId', 'featured', 'badges', 'availableColors', 'availableSizes', 'averageRating', 'totalReviews', 'stock', 'sku', 'weight', 'dimensions', 'materials', 'careInstructions', 'hasSizing', 'createdAt']
      }
    });

    // Fetch all categories
    // Note: We don't restrict attributes so that Sequelize automatically includes timestamps
    const categories = await Category.findAll({
      where: {
        status: 'active'
      },
      attributes: {
        exclude: ['description', 'image', 'parentId', 'sortOrder', 'createdAt']
      }
    });

    // Build sitemap XML with full absolute URLs
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Products Listing -->
  <url>
    <loc>${siteUrl}/products</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Static Pages -->
  <url>
    <loc>${siteUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${siteUrl}/faq</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <url>
    <loc>${siteUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  
  <!-- Category Pages -->
`;

    // Add category pages
    categories.forEach((category: Category) => {
      const categoryLastMod = category.updatedAt 
        ? new Date(category.updatedAt).toISOString().split('T')[0]
        : currentDate;
      
      sitemapXml += `  <url>
    <loc>${siteUrl}/products?category=${category.slug}</loc>
    <lastmod>${categoryLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    // Add product pages with slugs
    products.forEach((product: Product) => {
      if (!product.slug) {
        // Skip products without slugs (shouldn't happen in production)
        logger.warn(`Product ${product.id} (${product.title}) has no slug, skipping from sitemap`);
        return;
      }

      const productLastMod = product.updatedAt 
        ? new Date(product.updatedAt).toISOString().split('T')[0]
        : currentDate;
      
      sitemapXml += `  <url>
    <loc>${siteUrl}/product/${product.slug}</loc>
    <lastmod>${productLastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    });

    sitemapXml += `</urlset>`;

    // Set proper headers for XML
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemapXml);

    logger.info(`Sitemap generated with ${products.length} products and ${categories.length} categories`);

  } catch (error) {
    logger.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
};

