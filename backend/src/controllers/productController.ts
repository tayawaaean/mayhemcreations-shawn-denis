import { Request, Response } from 'express';
import { Product, Category, Variant } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export interface ProductFilters {
  categoryId?: number;
  subcategoryId?: number;
  status?: 'active' | 'inactive' | 'draft';
  featured?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      categoryId,
      subcategoryId,
      status = 'active',
      featured,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 20
    } = req.query;

    const filters: ProductFilters = {
      status: status as 'active' | 'inactive' | 'draft',
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      search: search as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
      page: Number(page),
      limit: Number(limit)
    };

    // Build where clause
    const whereClause: any = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.featured !== undefined) {
      whereClause.featured = filters.featured;
    }

    if (filters.categoryId) {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters.subcategoryId) {
      whereClause.subcategoryId = filters.subcategoryId;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
        { slug: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      whereClause.price = {};
      if (filters.minPrice !== undefined) {
        whereClause.price[Op.gte] = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        whereClause.price[Op.lte] = filters.maxPrice;
      }
    }

    // Build order clause - map camelCase to snake_case for database columns
    const orderClause: any[] = [];
    const columnMapping: { [key: string]: string } = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'categoryId': 'category_id',
      'subcategoryId': 'subcategory_id',
      'averageRating': 'average_rating',
      'totalReviews': 'total_reviews',
      'availableColors': 'available_colors',
      'availableSizes': 'available_sizes',
      'careInstructions': 'care_instructions'
    };

    if (filters.sortBy === 'price') {
      orderClause.push(['price', filters.sortOrder]);
    } else if (filters.sortBy === 'title') {
      orderClause.push(['title', filters.sortOrder]);
    } else if (filters.sortBy === 'featured') {
      orderClause.push(['featured', 'DESC']);
      orderClause.push(['created_at', 'DESC']); // Use database column name directly
    } else if (filters.sortBy === 'rating') {
      orderClause.push(['average_rating', 'DESC']); // Use database column name directly
    } else {
      // Map camelCase to snake_case if needed
      const sortByField = filters.sortBy || 'created_at';
      const dbColumnName = columnMapping[sortByField] || sortByField;
      orderClause.push([dbColumnName, filters.sortOrder]);
    }

    // Calculate pagination
    const offset = ((filters.page || 1) - 1) * (filters.limit || 20);

    // Fetch products with associations
    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'subcategory',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Variant,
          as: 'variants',
          attributes: ['id', 'name', 'color', 'colorHex', 'size', 'sku', 'stock', 'price', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ],
      order: orderClause,
      limit: filters.limit || 20,
      offset: offset
    });

    const totalPages = Math.ceil(count / (filters.limit || 20));

    logger.info(`Retrieved ${products.length} products (page ${filters.page || 1}/${totalPages})`);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total: count,
        pages: totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(parseInt(id), {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        },
        {
          model: Category,
          as: 'subcategory',
          attributes: ['id', 'name', 'slug', 'description']
        },
        {
          model: Variant,
          as: 'variants',
          attributes: ['id', 'name', 'color', 'colorHex', 'size', 'sku', 'stock', 'price', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    logger.info(`Retrieved product: ${product.title} (ID: ${product.id})`);

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProductBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({
      where: { slug },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        },
        {
          model: Category,
          as: 'subcategory',
          attributes: ['id', 'name', 'slug', 'description']
        },
        {
          model: Variant,
          as: 'variants',
          attributes: ['id', 'name', 'color', 'colorHex', 'size', 'sku', 'stock', 'price', 'isActive'],
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    logger.info(`Retrieved product by slug: ${product.title} (ID: ${product.id})`);

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('Error fetching product by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = req.body;

    // Validate required fields
    if (!productData.title || !productData.slug || !productData.description || !productData.price || !productData.image || !productData.alt || !productData.categoryId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: title, slug, description, price, image, alt, categoryId'
      });
      return;
    }

    // Check if product with slug already exists
    const existingProduct = await Product.findOne({
      where: { slug: productData.slug }
    });

    if (existingProduct) {
      res.status(400).json({
        success: false,
        message: 'A product with this slug already exists'
      });
      return;
    }

    // Validate category exists
    const category = await Category.findByPk(productData.categoryId);
    if (!category) {
      res.status(400).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    // Validate subcategory if provided
    if (productData.subcategoryId) {
      const subcategory = await Category.findByPk(productData.subcategoryId);
      if (!subcategory) {
        res.status(400).json({
          success: false,
          message: 'Subcategory not found'
        });
        return;
      }
    }

    const product = await Product.create(productData);

    // Fetch the created product with associations
    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'subcategory',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    logger.info(`Created product: ${product.title} (ID: ${product.id})`);

    res.status(201).json({
      success: true,
      data: createdProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByPk(parseInt(id));

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Check if slug is being changed and if it already exists
    if (updateData.slug && updateData.slug !== product.slug) {
      const existingProduct = await Product.findOne({
        where: { slug: updateData.slug }
      });

      if (existingProduct) {
        res.status(400).json({
          success: false,
          message: 'A product with this slug already exists'
        });
        return;
      }
    }

    // Validate category if provided
    if (updateData.categoryId) {
      const category = await Category.findByPk(updateData.categoryId);
      if (!category) {
        res.status(400).json({
          success: false,
          message: 'Category not found'
        });
        return;
      }
    }

    // Validate subcategory if provided
    if (updateData.subcategoryId) {
      const subcategory = await Category.findByPk(updateData.subcategoryId);
      if (!subcategory) {
        res.status(400).json({
          success: false,
          message: 'Subcategory not found'
        });
        return;
      }
    }

    await product.update(updateData);

    // Fetch the updated product with associations
    const updatedProduct = await Product.findByPk(product.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        },
        {
          model: Category,
          as: 'subcategory',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    logger.info(`Updated product: ${product.title} (ID: ${product.id})`);

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(parseInt(id));

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    await product.destroy();

    logger.info(`Deleted product: ${product.title} (ID: ${product.id})`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getProductStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalProducts = await Product.count();
    const activeProducts = await Product.count({ where: { status: 'active' } });
    const inactiveProducts = await Product.count({ where: { status: 'inactive' } });
    const draftProducts = await Product.count({ where: { status: 'draft' } });
    const featuredProducts = await Product.count({ where: { featured: true } });
    const outOfStock = await Product.count({ where: { stock: 0 } });

    const stats = {
      total: totalProducts,
      active: activeProducts,
      inactive: inactiveProducts,
      draft: draftProducts,
      featured: featuredProducts,
      outOfStock
    };

    logger.info('Retrieved product statistics');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product statistics',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update product inventory (add or subtract stock)
 */
export const updateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { quantity, operation, reason } = req.body;

    // Validate input
    if (!quantity || typeof quantity !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Quantity must be a valid number'
      });
      return;
    }

    if (!operation || !['add', 'subtract', 'set'].includes(operation)) {
      res.status(400).json({
        success: false,
        message: 'Operation must be "add", "subtract", or "set"'
      });
      return;
    }

    // Find the product
    const product = await Product.findByPk(parseInt(id));
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const currentStock = product.stock || 0;
    let newStock: number;

    switch (operation) {
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - quantity); // Prevent negative stock
        break;
      case 'set':
        newStock = Math.max(0, quantity); // Prevent negative stock
        break;
      default:
        newStock = currentStock;
    }

    // Update the product stock
    await product.update({ stock: newStock });

    logger.info(`Updated inventory for product ${product.title} (ID: ${product.id}): ${currentStock} → ${newStock} (${operation} ${quantity})${reason ? ` - ${reason}` : ''}`);

    res.json({
      success: true,
      data: {
        productId: product.id,
        title: product.title,
        previousStock: currentStock,
        newStock: newStock,
        operation: operation,
        quantity: quantity,
        reason: reason || null
      },
      message: 'Inventory updated successfully'
    });

  } catch (error) {
    logger.error('Error updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get inventory status for all products or specific products
 */
export const getInventoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lowStockThreshold, outOfStock = 'false' } = req.query;
    const threshold = lowStockThreshold ? parseInt(lowStockThreshold as string) : null;

    let whereClause: any = {};
    
    if (outOfStock === 'true') {
      whereClause.stock = { [Op.lte]: 0 };
    } else if (threshold !== null && threshold > 0) {
      whereClause.stock = { [Op.lte]: threshold };
    }
    // If no threshold is provided, return all products

    const products = await Product.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ],
      attributes: ['id', 'title', 'slug', 'sku', 'stock', 'status', 'price', 'image', 'alt'],
      order: [['stock', 'ASC'], ['title', 'ASC']]
    });

    // Get inventory statistics
    const totalProducts = await Product.count();
    const outOfStockCount = await Product.count({ where: { stock: { [Op.lte]: 0 } } });
    const lowStockCount = threshold !== null ? await Product.count({ 
      where: { 
        stock: { 
          [Op.gt]: 0,
          [Op.lte]: threshold 
        } 
      } 
    }) : 0;

    logger.info(`Retrieved inventory status: ${products.length} products`);

    res.json({
      success: true,
      data: {
        products,
        statistics: {
          total: totalProducts,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount,
          lowStockThreshold: threshold
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching inventory status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory status',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Bulk update inventory for multiple products
 */
export const bulkUpdateInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Updates array is required and must not be empty'
      });
      return;
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { productId, quantity, operation, reason } = update;

        if (!productId || !quantity || !operation) {
          errors.push({
            productId,
            error: 'Missing required fields: productId, quantity, operation'
          });
          continue;
        }

        const product = await Product.findByPk(productId);
        if (!product) {
          errors.push({
            productId,
            error: 'Product not found'
          });
          continue;
        }

        const currentStock = product.stock || 0;
        let newStock: number;

        switch (operation) {
          case 'add':
            newStock = currentStock + quantity;
            break;
          case 'subtract':
            newStock = Math.max(0, currentStock - quantity);
            break;
          case 'set':
            newStock = Math.max(0, quantity);
            break;
          default:
            errors.push({
              productId,
              error: 'Invalid operation. Must be "add", "subtract", or "set"'
            });
            continue;
        }

        await product.update({ stock: newStock });

        results.push({
          productId,
          title: product.title,
          previousStock: currentStock,
          newStock: newStock,
          operation: operation,
          quantity: quantity,
          reason: reason || null
        });

        logger.info(`Bulk updated inventory for product ${product.title} (ID: ${product.id}): ${currentStock} → ${newStock} (${operation} ${quantity})`);

      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: updates.length,
          successful: results.length,
          failed: errors.length
        }
      },
      message: `Bulk inventory update completed. ${results.length} successful, ${errors.length} failed.`
    });

  } catch (error) {
    logger.error('Error in bulk inventory update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk inventory update',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

