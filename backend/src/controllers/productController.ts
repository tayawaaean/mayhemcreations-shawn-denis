import { Request, Response } from 'express';
import { Product, Category, Variant } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import { getWebSocketService } from '../services/websocketService';

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

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     description: Retrieves a paginated list of products with optional filtering, searching, and sorting.
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: subcategoryId
 *         schema:
 *           type: integer
 *         description: Filter by subcategory ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, draft]
 *           default: active
 *         description: Filter by product status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured products
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by title, description, or slug
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

    // Validate that the ID is a valid number before attempting to parse it
    const productId = parseInt(id);
    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
      return;
    }

    const product = await Product.findByPk(productId, {
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
  const productData = req.body;
  try {

    // Validate required fields
    // Check categoryId is valid (not 0, null, or undefined)
    if (!productData.title || !productData.slug || !productData.description || !productData.price || !productData.alt || !productData.categoryId || productData.categoryId === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: title, slug, description, price, alt, categoryId',
        providedCategoryId: productData.categoryId
      });
      return;
    }

    // Handle multiple images
    let processedImageData = productData.image; // For backward compatibility
    let imagesArray: string[] = [];
    let primaryImageIndex = 0;

    if (productData.images && Array.isArray(productData.images) && productData.images.length > 0) {
      imagesArray = productData.images;
      primaryImageIndex = productData.primaryImageIndex || 0;
      
      // Ensure primary image index is valid
      if (primaryImageIndex >= imagesArray.length) {
        primaryImageIndex = 0;
      }
      
      // Set the primary image for backward compatibility
      processedImageData = imagesArray[primaryImageIndex];
    } else if (productData.image) {
      // Single image provided - convert to array format
      imagesArray = [productData.image];
      processedImageData = productData.image;
    } else {
      res.status(400).json({
        success: false,
        message: 'At least one image is required'
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

    // Validate and convert categoryId
    const categoryId = parseInt(String(productData.categoryId), 10);
    if (isNaN(categoryId) || categoryId <= 0) {
      logger.error('Invalid categoryId provided:', { categoryId: productData.categoryId, type: typeof productData.categoryId });
      res.status(400).json({
        success: false,
        message: `Invalid category ID: ${productData.categoryId}`
      });
      return;
    }

    // Validate category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      logger.error('Category not found:', { categoryId, provided: productData.categoryId });
      
      // Check if any categories exist at all
      const categoryCount = await Category.count();
      logger.warn(`Category lookup failed. Total categories in database: ${categoryCount}`);
      
      res.status(400).json({
        success: false,
        message: `Category not found with ID: ${categoryId}`
      });
      return;
    }
    
    logger.info(`Category validation passed: ${category.name} (ID: ${category.id})`);

    // Validate subcategory if provided
    let subcategoryId: number | undefined = undefined;
    if (productData.subcategoryId) {
      const parsedSubcategoryId = parseInt(String(productData.subcategoryId), 10);
      if (isNaN(parsedSubcategoryId) || parsedSubcategoryId <= 0) {
        logger.error('Invalid subcategoryId provided:', { subcategoryId: productData.subcategoryId });
        res.status(400).json({
          success: false,
          message: `Invalid subcategory ID: ${productData.subcategoryId}`
        });
        return;
      }
      
      const subcategory = await Category.findByPk(parsedSubcategoryId);
      if (!subcategory) {
        logger.error('Subcategory not found:', { subcategoryId: parsedSubcategoryId });
        res.status(400).json({
          success: false,
          message: `Subcategory not found with ID: ${parsedSubcategoryId}`
        });
        return;
      }
      subcategoryId = parsedSubcategoryId;
    }

    // Explicitly map fields to prevent accepting unexpected data
    const product = await Product.create({
      title: productData.title,
      slug: productData.slug,
      description: productData.description,
      price: productData.price,
      alt: productData.alt,
      categoryId: categoryId,
      subcategoryId: subcategoryId,
      status: productData.status || 'draft',
      featured: productData.featured || false,
      sku: productData.sku,
      weight: productData.weight,
      dimensions: productData.dimensions,
      hasSizing: productData.hasSizing || false,
      image: processedImageData,
      images: imagesArray,
      primaryImageIndex: primaryImageIndex,
      // Optional fields that may be present but not required
      badges: productData.badges,
      availableColors: productData.availableColors,
      availableSizes: productData.availableSizes,
      averageRating: productData.averageRating,
      totalReviews: productData.totalReviews,
      stock: productData.stock,
      materials: productData.materials,
      careInstructions: productData.careInstructions
    });

    // Fetch the created product with associations
    // Note: Excluding large image data from response to avoid response size issues
    // The frontend already has the image data from the request
    let createdProduct;
    try {
      createdProduct = await Product.findByPk(product.id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'slug'],
            required: false
          },
          {
            model: Category,
            as: 'subcategory',
            attributes: ['id', 'name', 'slug'],
            required: false
          }
        ]
      });
    } catch (fetchError: any) {
      // If fetching with associations fails, try without associations
      logger.warn('Failed to fetch product with associations, fetching without:', fetchError?.message);
      createdProduct = await Product.findByPk(product.id);
    }

    logger.info(`Created product: ${product.title} (ID: ${product.id})`);

    // Prepare response data - exclude large base64 images to prevent response size issues
    // The frontend already has the image data, so we don't need to send it back
    // Use null-safe access to prevent undefined errors
    const responseData = createdProduct ? {
      id: createdProduct.id || product.id,
      title: createdProduct.title || product.title || '',
      slug: createdProduct.slug || product.slug || '',
      description: createdProduct.description || product.description || '',
      price: createdProduct.price || product.price || 0,
      sku: createdProduct.sku || product.sku || null,
      status: createdProduct.status || product.status || 'draft',
      featured: createdProduct.featured ?? product.featured ?? false,
      alt: createdProduct.alt || product.alt || '',
      categoryId: createdProduct.categoryId || product.categoryId,
      subcategoryId: createdProduct.subcategoryId ?? product.subcategoryId ?? null,
      weight: createdProduct.weight ?? product.weight ?? null,
      dimensions: createdProduct.dimensions || product.dimensions || null,
      hasSizing: createdProduct.hasSizing ?? product.hasSizing ?? false,
      primaryImageIndex: createdProduct.primaryImageIndex ?? product.primaryImageIndex ?? 0,
      // Exclude large image data - frontend already has it
      image: '[omitted - image data too large for response]',
      images: (createdProduct.images && Array.isArray(createdProduct.images)) 
        ? `[${createdProduct.images.length} images omitted]` 
        : (product.images && Array.isArray(product.images))
          ? `[${product.images.length} images omitted]`
          : null,
      category: createdProduct.category ? {
        id: createdProduct.category.id || null,
        name: createdProduct.category.name || null,
        slug: createdProduct.category.slug || null
      } : null,
      subcategory: createdProduct.subcategory ? {
        id: createdProduct.subcategory.id || null,
        name: createdProduct.subcategory.name || null,
        slug: createdProduct.subcategory.slug || null
      } : null,
      createdAt: createdProduct.createdAt || product.createdAt || new Date().toISOString(),
      updatedAt: createdProduct.updatedAt || product.updatedAt || new Date().toISOString()
    } : {
      id: product.id,
      title: product.title || '',
      slug: product.slug || '',
      message: 'Product created successfully. Image data excluded from response due to size.'
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Product created successfully'
    });

  } catch (error: any) {
    // Check for foreign key constraint errors specifically
    const isForeignKeyError = error?.message?.includes('foreign key constraint') || 
                              error?.message?.includes('FOREIGN KEY') ||
                              error?.code === 'ER_NO_REFERENCED_ROW_2' ||
                              error?.sqlState === '23000';
    
    if (isForeignKeyError) {
      logger.error('Foreign key constraint error creating product:', {
        message: error?.message,
        categoryId: productData?.categoryId,
        subcategoryId: productData?.subcategoryId,
        error: error
      });
      
      // Provide a more helpful error message
      let errorMessage = 'Invalid category or subcategory. Please select a valid category.';
      if (error?.message?.includes('category_id')) {
        errorMessage = `The selected category (ID: ${productData?.categoryId}) does not exist. Please select a valid category.`;
      } else if (error?.message?.includes('subcategory_id')) {
        errorMessage = `The selected subcategory (ID: ${productData?.subcategoryId}) does not exist. Please select a valid subcategory.`;
      }
      
      res.status(400).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
      return;
    }
    
    logger.error('Error creating product:', {
      message: error?.message,
      stack: error?.stack,
      error: error,
      productData: {
        title: productData?.title,
        slug: productData?.slug,
        categoryId: productData?.categoryId,
        subcategoryId: productData?.subcategoryId,
        hasImage: !!productData?.image,
        hasImages: !!productData?.images,
        imageLength: productData?.image?.length || 0,
        imagesCount: productData?.images?.length || 0
      }
    });
    
    // If product was created but response failed, return success with minimal data
    if (error?.message?.includes('response') || error?.code === 'ECONNRESET' || error?.code === 'EPIPE') {
      logger.warn('Response error after product creation - product may have been created');
      try {
        const product = await Product.findOne({ where: { slug: productData?.slug } });
        if (product) {
          res.status(201).json({
            success: true,
            data: {
              id: product.id,
              title: product.title,
              slug: product.slug
            },
            message: 'Product created successfully (response truncated)'
          });
          return;
        }
      } catch (lookupError) {
        // Fall through to error response
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
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

    // Handle multiple images update
    let processedImageData = updateData.image || product.image;
    let imagesArray = updateData.images || product.images || [];
    let primaryImageIndex = updateData.primaryImageIndex !== undefined ? updateData.primaryImageIndex : product.primaryImageIndex || 0;

    if (updateData.images && Array.isArray(updateData.images) && updateData.images.length > 0) {
      imagesArray = updateData.images;
      primaryImageIndex = updateData.primaryImageIndex || 0;
      
      // Ensure primary image index is valid
      if (primaryImageIndex >= imagesArray.length) {
        primaryImageIndex = 0;
      }
      
      // Set the primary image for backward compatibility
      processedImageData = imagesArray[primaryImageIndex];
    } else if (updateData.image) {
      // Single image provided - update the array
      if (imagesArray.length === 0) {
        imagesArray = [updateData.image];
      } else {
        imagesArray[primaryImageIndex] = updateData.image;
      }
      processedImageData = updateData.image;
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

    // Explicitly map fields to prevent accepting unexpected data
    // Only update fields that are provided in updateData
    const updateFields: any = {
      image: processedImageData,
      images: imagesArray,
      primaryImageIndex: primaryImageIndex
    };

    // Map allowed fields explicitly
    if (updateData.title !== undefined) updateFields.title = updateData.title;
    if (updateData.slug !== undefined) updateFields.slug = updateData.slug;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.price !== undefined) updateFields.price = updateData.price;
    if (updateData.alt !== undefined) updateFields.alt = updateData.alt;
    if (updateData.categoryId !== undefined) updateFields.categoryId = updateData.categoryId;
    if (updateData.subcategoryId !== undefined) updateFields.subcategoryId = updateData.subcategoryId || null;
    if (updateData.status !== undefined) updateFields.status = updateData.status;
    if (updateData.featured !== undefined) updateFields.featured = updateData.featured;
    if (updateData.sku !== undefined) updateFields.sku = updateData.sku;
    if (updateData.weight !== undefined) updateFields.weight = updateData.weight;
    if (updateData.dimensions !== undefined) updateFields.dimensions = updateData.dimensions;
    if (updateData.hasSizing !== undefined) updateFields.hasSizing = updateData.hasSizing;
    if (updateData.badges !== undefined) updateFields.badges = updateData.badges;
    if (updateData.availableColors !== undefined) updateFields.availableColors = updateData.availableColors;
    if (updateData.availableSizes !== undefined) updateFields.availableSizes = updateData.availableSizes;
    if (updateData.averageRating !== undefined) updateFields.averageRating = updateData.averageRating;
    if (updateData.totalReviews !== undefined) updateFields.totalReviews = updateData.totalReviews;
    if (updateData.stock !== undefined) updateFields.stock = updateData.stock;
    if (updateData.materials !== undefined) updateFields.materials = updateData.materials;
    if (updateData.careInstructions !== undefined) updateFields.careInstructions = updateData.careInstructions;

    await product.update(updateFields);

    // Emit WebSocket event for product status changes
    const webSocketService = getWebSocketService();
    if (webSocketService && updateData.status) {
      webSocketService.emitProductStatusChange(product.id, {
        status: updateData.status,
        productTitle: product.title,
        previousStatus: product.status
      });
    }

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

