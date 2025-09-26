import { Request, Response } from 'express';
import { Variant, Product, Category } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';
import { getWebSocketService } from '../services/websocketService';

/**
 * Get all variants with optional filtering
 */
export const getVariants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      productId, 
      isActive = 'true',
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    if (productId) {
      whereClause.productId = productId;
    }

    if (isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { color: { [Op.iLike]: `%${search}%` } },
        { size: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: variants } = await Variant.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'price', 'image'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug']
            }
          ]
        }
      ],
      order: [[sortBy as string, sortOrder as string]],
      limit: Number(limit),
      offset: offset,
    });

    const totalPages = Math.ceil(count / Number(limit));

    logger.info(`Retrieved ${variants.length} variants`);

    res.json({
      success: true,
      data: variants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: totalPages,
      },
    });

  } catch (error) {
    logger.error('Error fetching variants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variants',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get a single variant by ID
 */
export const getVariantById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const variant = await Variant.findByPk(parseInt(id), {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'price', 'image'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug']
            }
          ]
        }
      ]
    });

    if (!variant) {
      res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
      return;
    }

    logger.info(`Retrieved variant: ${variant.name} (ID: ${variant.id})`);

    res.json({
      success: true,
      data: variant
    });

  } catch (error) {
    logger.error('Error fetching variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variant',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Create a new variant
 */
export const createVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      productId,
      name,
      color,
      colorHex,
      size,
      sku,
      stock,
      price,
      image,
      weight,
      dimensions,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!productId || !name || !sku) {
      res.status(400).json({
        success: false,
        message: 'Product ID, name, and SKU are required'
      });
      return;
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Check if SKU already exists
    const existingVariant = await Variant.findOne({ where: { sku } });
    if (existingVariant) {
      res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
      return;
    }

    const variant = await Variant.create({
      productId,
      name,
      color,
      colorHex,
      size,
      sku,
      stock: stock || 0,
      price,
      image,
      weight,
      dimensions,
      isActive
    });

    // Fetch the created variant with associations
    const createdVariant = await Variant.findByPk(variant.id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'price', 'image']
        }
      ]
    });

    logger.info(`Created variant: ${variant.name} (ID: ${variant.id}) for product: ${product.title}`);

    res.status(201).json({
      success: true,
      data: createdVariant,
      message: 'Variant created successfully'
    });

  } catch (error) {
    logger.error('Error creating variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create variant',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update a variant
 */
export const updateVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const variant = await Variant.findByPk(parseInt(id));
    if (!variant) {
      res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
      return;
    }

    // Check if SKU is being changed and if it already exists
    if (updateData.sku && updateData.sku !== variant.sku) {
      const existingVariant = await Variant.findOne({ 
        where: { 
          sku: updateData.sku,
          id: { [Op.ne]: parseInt(id) }
        } 
      });
      if (existingVariant) {
        res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
        return;
      }
    }

    await variant.update(updateData);

    // Fetch the updated variant with associations
    const updatedVariant = await Variant.findByPk(variant.id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'price', 'image']
        }
      ]
    });

    logger.info(`Updated variant: ${variant.name} (ID: ${variant.id})`);

    res.json({
      success: true,
      data: updatedVariant,
      message: 'Variant updated successfully'
    });

  } catch (error) {
    logger.error('Error updating variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update variant',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Delete a variant
 */
export const deleteVariant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const variant = await Variant.findByPk(parseInt(id));
    if (!variant) {
      res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
      return;
    }

    await variant.destroy();

    logger.info(`Deleted variant: ${variant.name} (ID: ${variant.id})`);

    res.json({
      success: true,
      message: 'Variant deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting variant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete variant',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update variant inventory (add or subtract stock)
 */
export const updateVariantInventory = async (req: Request, res: Response): Promise<void> => {
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

    // Find the variant
    const variant = await Variant.findByPk(parseInt(id));
    if (!variant) {
      res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
      return;
    }

    const currentStock = variant.stock || 0;
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

    // Update the variant stock
    await variant.update({ stock: newStock });

    logger.info(`Updated inventory for variant ${variant.name} (ID: ${variant.id}): ${currentStock} → ${newStock} (${operation} ${quantity})${reason ? ` - ${reason}` : ''}`);

    // Calculate total product stock from all variants
    const allVariants = await Variant.findAll({
      where: { productId: variant.productId },
      attributes: ['stock']
    });
    const totalProductStock = allVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

    // Emit WebSocket event for real-time updates
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.emitInventoryUpdate(variant.productId, variant.id, {
        stock: newStock, // Individual variant stock
        totalProductStock: totalProductStock, // Total product stock
        previousStock: currentStock,
        operation: operation,
        quantity: quantity,
        reason: reason || null,
        variantName: variant.name,
        sku: variant.sku
      });

      // Check for stock alerts
      if (newStock <= 10 && newStock > 0) {
        webSocketService.emitStockAlert(variant.productId, variant.id, {
          stockLevel: 'low',
          message: `Low stock alert: ${variant.name} has ${newStock} units remaining`,
          variantName: variant.name,
          sku: variant.sku
        });
      } else if (newStock === 0) {
        webSocketService.emitStockAlert(variant.productId, variant.id, {
          stockLevel: 'out',
          message: `Out of stock: ${variant.name} is now out of stock`,
          variantName: variant.name,
          sku: variant.sku
        });
      }
    }

    res.json({
      success: true,
      data: {
        variantId: variant.id,
        name: variant.name,
        sku: variant.sku,
        previousStock: currentStock,
        newStock: newStock,
        operation: operation,
        quantity: quantity,
        reason: reason || null
      },
      message: 'Variant inventory updated successfully'
    });

  } catch (error) {
    logger.error('Error updating variant inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update variant inventory',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get variant inventory status
 */
export const getVariantInventoryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lowStockThreshold, outOfStock = 'false', productId } = req.query;
    const threshold = lowStockThreshold ? parseInt(lowStockThreshold as string) : null;

    let whereClause: any = {};
    
    if (productId) {
      whereClause.productId = productId;
    }
    
    if (outOfStock === 'true') {
      whereClause.stock = { [Op.lte]: 0 };
    } else if (threshold !== null && threshold > 0) {
      whereClause.stock = { [Op.lte]: threshold };
    }
    // If no threshold is provided, return all variants

    const variants = await Variant.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'title', 'slug', 'price', 'image'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name', 'slug']
            }
          ]
        }
      ],
      order: [['stock', 'ASC'], ['name', 'ASC']]
    });

    // Get inventory statistics
    const totalVariants = await Variant.count();
    const outOfStockCount = await Variant.count({ where: { stock: { [Op.lte]: 0 } } });
    const lowStockCount = threshold !== null ? await Variant.count({ 
      where: { 
        stock: { 
          [Op.gt]: 0,
          [Op.lte]: threshold 
        } 
      } 
    }) : 0;

    logger.info(`Retrieved variant inventory status: ${variants.length} variants`);

    res.json({
      success: true,
      data: {
        variants,
        statistics: {
          total: totalVariants,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount,
          lowStockThreshold: threshold
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching variant inventory status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variant inventory status',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
