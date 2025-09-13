import { Request, Response } from 'express';
import { Product, Category } from '../models';
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
