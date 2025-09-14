import { Request, Response } from 'express';
import { EmbroideryOption } from '../models';
import { logger } from '../utils/logger';
import { Op } from 'sequelize';

export interface EmbroideryOptionFilters {
  category?: string;
  level?: string;
  isActive?: boolean;
  isPopular?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const getEmbroideryOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      level,
      isActive = true,
      isPopular,
      search,
      page = 1,
      limit = 50
    } = req.query as EmbroideryOptionFilters;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by level
    if (level) {
      whereClause.level = level;
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereClause.isActive = typeof isActive === 'boolean' ? isActive : isActive === 'true';
    }

    // Filter by popular status
    if (isPopular !== undefined) {
      whereClause.isPopular = typeof isPopular === 'boolean' ? isPopular : isPopular === 'true';
    }

    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: embroideryOptions } = await EmbroideryOption.findAndCountAll({
      where: whereClause,
      order: [
        ['category', 'ASC'],
        ['level', 'ASC'],
        ['price', 'ASC'],
        ['name', 'ASC']
      ],
      limit: Number(limit),
      offset,
    });

    const totalPages = Math.ceil(count / Number(limit));

    logger.info(`Retrieved ${embroideryOptions.length} embroidery options`);

    res.json({
      success: true,
      data: embroideryOptions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: totalPages,
      },
    });

  } catch (error) {
    logger.error('Error fetching embroidery options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch embroidery options',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const getEmbroideryOptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const embroideryOption = await EmbroideryOption.findByPk(parseInt(id));

    if (!embroideryOption) {
      res.status(404).json({
        success: false,
        message: 'Embroidery option not found'
      });
      return;
    }

    logger.info(`Retrieved embroidery option: ${embroideryOption.name} (ID: ${embroideryOption.id})`);

    res.json({
      success: true,
      data: embroideryOption
    });

  } catch (error) {
    logger.error('Error fetching embroidery option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch embroidery option',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const createEmbroideryOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      price,
      image,
      stitches,
      estimatedTime,
      category,
      level,
      isPopular,
      isActive,
      isIncompatible
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !level) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, description, category, level'
      });
      return;
    }

    // Validate category
    const validCategories = ['coverage', 'threads', 'material', 'border', 'backing', 'upgrades', 'cutting'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        message: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
      return;
    }

    // Validate level
    const validLevels = ['basic', 'standard', 'premium', 'luxury'];
    if (!validLevels.includes(level)) {
      res.status(400).json({
        success: false,
        message: 'Invalid level. Must be one of: ' + validLevels.join(', ')
      });
      return;
    }

    const embroideryOption = await EmbroideryOption.create({
      name,
      description,
      price: parseFloat(price) || 0,
      image: image || '',
      stitches: parseInt(stitches) || 0,
      estimatedTime: estimatedTime || '0 days',
      category,
      level,
      isPopular: isPopular === true || isPopular === 'true',
      isActive: isActive !== false && isActive !== 'false',
      isIncompatible: isIncompatible ? JSON.stringify(isIncompatible) : undefined,
    });

    logger.info(`Created embroidery option: ${embroideryOption.name} (ID: ${embroideryOption.id})`);

    res.status(201).json({
      success: true,
      data: embroideryOption,
      message: 'Embroidery option created successfully'
    });

  } catch (error) {
    logger.error('Error creating embroidery option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create embroidery option',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const updateEmbroideryOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate category if provided
    if (updateData.category) {
      const validCategories = ['coverage', 'threads', 'material', 'border', 'backing', 'upgrades', 'cutting'];
      if (!validCategories.includes(updateData.category)) {
        res.status(400).json({
          success: false,
          message: 'Invalid category. Must be one of: ' + validCategories.join(', ')
        });
        return;
      }
    }

    // Validate level if provided
    if (updateData.level) {
      const validLevels = ['basic', 'standard', 'premium', 'luxury'];
      if (!validLevels.includes(updateData.level)) {
        res.status(400).json({
          success: false,
          message: 'Invalid level. Must be one of: ' + validLevels.join(', ')
        });
        return;
      }
    }

    // Handle isIncompatible array conversion
    if (updateData.isIncompatible && Array.isArray(updateData.isIncompatible)) {
      updateData.isIncompatible = JSON.stringify(updateData.isIncompatible);
    }

    const [updatedRowsCount] = await EmbroideryOption.update(updateData, {
      where: { id: parseInt(id) }
    });

    if (updatedRowsCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Embroidery option not found'
      });
      return;
    }

    const updatedEmbroideryOption = await EmbroideryOption.findByPk(parseInt(id));

    logger.info(`Updated embroidery option: ${updatedEmbroideryOption?.name} (ID: ${id})`);

    res.json({
      success: true,
      data: updatedEmbroideryOption,
      message: 'Embroidery option updated successfully'
    });

  } catch (error) {
    logger.error('Error updating embroidery option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update embroidery option',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const deleteEmbroideryOption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deletedRowsCount = await EmbroideryOption.destroy({
      where: { id: parseInt(id) }
    });

    if (deletedRowsCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Embroidery option not found'
      });
      return;
    }

    logger.info(`Deleted embroidery option (ID: ${id})`);

    res.json({
      success: true,
      message: 'Embroidery option deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting embroidery option:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete embroidery option',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

export const toggleEmbroideryOptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const [updatedRowsCount] = await EmbroideryOption.update(
      { isActive: isActive === true || isActive === 'true' },
      { where: { id: parseInt(id) } }
    );

    if (updatedRowsCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Embroidery option not found'
      });
      return;
    }

    const updatedEmbroideryOption = await EmbroideryOption.findByPk(parseInt(id));

    logger.info(`Toggled embroidery option status: ${updatedEmbroideryOption?.name} (ID: ${id}) - Active: ${updatedEmbroideryOption?.isActive}`);

    res.json({
      success: true,
      data: updatedEmbroideryOption,
      message: `Embroidery option ${updatedEmbroideryOption?.isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    logger.error('Error toggling embroidery option status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle embroidery option status',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
