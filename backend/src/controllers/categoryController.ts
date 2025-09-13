import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Category, CategoryAttributes, CategoryCreationAttributes } from '../models/categoryModel';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Category Controller
 * Handles all category-related API operations
 */

/**
 * Get all categories with optional filtering and hierarchy
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      parentId,
      includeChildren = 'true',
      search,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
      page,
      limit
    } = req.query;

    // Build where clause
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (parentId !== undefined) {
      if (parentId === 'null' || parentId === '') {
        whereClause.parentId = null;
      } else {
        whereClause.parentId = parseInt(parentId as string);
      }
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { slug: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Build include clause for children
    const includeChildrenBool = includeChildren === 'true';
    
    // Build where clause - if includeChildren is true, only get parent categories
    if (includeChildrenBool) {
      whereClause.parentId = null; // Only get parent categories when including children
    }
    
    const includeClause = includeChildrenBool ? [
      {
        model: Category,
        as: 'children',
        required: false,
        order: [['sortOrder', 'ASC']],
      }
    ] : [];

    // Build order clause for hierarchical sorting
    const orderClause: any[] = [];
    
    if (includeChildrenBool) {
      // For hierarchical display: only parent categories with their children
      orderClause.push([sortBy as string, sortOrder as string]); // Sort parents by sort order
      orderClause.push([{ model: Category, as: 'children' }, 'sortOrder', 'ASC']); // Children by sort order
    } else {
      // For flat display: parents first, then children
      orderClause.push([sequelize.literal('CASE WHEN `parentId` IS NULL THEN 0 ELSE 1 END'), 'ASC']); // Parents first (parentId is null)
      orderClause.push([sortBy as string, sortOrder as string]); // Then by sort order
    }

    let queryOptions: any = {
      where: whereClause,
      include: includeClause,
      order: orderClause,
    };

    // Add pagination if requested
    if (page && limit) {
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      queryOptions.limit = parseInt(limit as string);
      queryOptions.offset = offset;
    }

    const categories = await Category.findAll(queryOptions);

    // Get total count for pagination
    let totalCount = 0;
    if (page && limit) {
      totalCount = await Category.count({ where: whereClause });
    }

    logger.info(`Retrieved ${categories.length} categories`);

    res.json({
      success: true,
      data: categories,
      pagination: page && limit ? {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit as string))
      } : undefined
    });

  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get a single category by ID
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { includeChildren = 'true' } = req.query;

    const includeClause = includeChildren === 'true' ? [
      {
        model: Category,
        as: 'children',
        required: false,
      },
      {
        model: Category,
        as: 'parent',
        required: false,
      }
    ] : [];

    const category = await Category.findByPk(parseInt(id), {
      include: includeClause,
      order: includeChildren === 'true' ? [[{ model: Category, as: 'children' }, 'sortOrder', 'ASC']] : [],
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    logger.info(`Retrieved category: ${category.name} (ID: ${category.id})`);

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    logger.error('Error getting category by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Create a new category
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryData: CategoryCreationAttributes = req.body;

    // Validate required fields
    if (!categoryData.name || !categoryData.slug) {
      res.status(400).json({
        success: false,
        message: 'Name and slug are required'
      });
      return;
    }

    // Check if slug already exists
    const existingCategory = await Category.findOne({
      where: { slug: categoryData.slug }
    });

    if (existingCategory) {
      res.status(409).json({
        success: false,
        message: 'A category with this slug already exists'
      });
      return;
    }

    // Validate parent category if provided
    if (categoryData.parentId) {
      const parentCategory = await Category.findByPk(categoryData.parentId);
      if (!parentCategory) {
        res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
        return;
      }
    }

    const category = await Category.create(categoryData);

    // Fetch the created category with associations
    const createdCategory = await Category.findByPk(category.id, {
      include: [
        {
          model: Category,
          as: 'children',
          required: false,
        },
        {
          model: Category,
          as: 'parent',
          required: false,
        }
      ]
    });

    logger.info(`Created category: ${category.name} (ID: ${category.id})`);

    res.status(201).json({
      success: true,
      data: createdCategory,
      message: 'Category created successfully'
    });

  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update a category
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Partial<CategoryAttributes> = req.body;

    const category = await Category.findByPk(parseInt(id));

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    // Check if slug is being updated and if it already exists
    if (updateData.slug && updateData.slug !== category.slug) {
      const existingCategory = await Category.findOne({
        where: { 
          slug: updateData.slug,
          id: { [Op.ne]: parseInt(id) }
        }
      });

      if (existingCategory) {
        res.status(409).json({
          success: false,
          message: 'A category with this slug already exists'
        });
        return;
      }
    }

    // Validate parent category if being updated
    if (updateData.parentId !== undefined) {
      if (updateData.parentId === null) {
        // Setting to root category - already null, no need to reassign
      } else {
        const parentCategory = await Category.findByPk(updateData.parentId);
        if (!parentCategory) {
          res.status(400).json({
            success: false,
            message: 'Parent category not found'
          });
          return;
        }

        // Prevent setting parent to self or descendant
        if (updateData.parentId === parseInt(id)) {
          res.status(400).json({
            success: false,
            message: 'Category cannot be its own parent'
          });
          return;
        }

        // Check for circular reference
        const isDescendant = await checkIfDescendant(parseInt(id), updateData.parentId);
        if (isDescendant) {
          res.status(400).json({
            success: false,
            message: 'Category cannot be a parent of its own descendant'
          });
          return;
        }
      }
    }

    await category.update(updateData);

    // Fetch the updated category with associations
    const updatedCategory = await Category.findByPk(category.id, {
      include: [
        {
          model: Category,
          as: 'children',
          required: false,
        },
        {
          model: Category,
          as: 'parent',
          required: false,
        }
      ]
    });

    logger.info(`Updated category: ${category.name} (ID: ${category.id})`);

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });

  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Delete a category
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { force = 'false' } = req.query;

    const category = await Category.findByPk(parseInt(id));

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
      return;
    }

    // Check if category has children
    const childrenCount = await Category.count({
      where: { parentId: parseInt(id) }
    });

    if (childrenCount > 0 && force !== 'true') {
      res.status(400).json({
        success: false,
        message: 'Cannot delete category with children. Use force=true to delete with children.',
        childrenCount
      });
      return;
    }

    // If force delete, delete with cascade (children will be automatically deleted due to CASCADE constraint)
    if (childrenCount > 0 && force === 'true') {
      logger.info(`Force deleting category ${category.name} with ${childrenCount} children (cascade delete)`);
    }

    await category.destroy();

    logger.info(`Deleted category: ${category.name} (ID: ${category.id})`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get category statistics
 */
export const getCategoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const total = await Category.count();
    const active = await Category.count({ where: { status: 'active' } });
    const inactive = await Category.count({ where: { status: 'inactive' } });
    const rootCategories = await Category.count({ where: { parentId: { [Op.is]: null } } as any });
    const categoriesWithChildren = await Category.count({
      include: [
        {
          model: Category,
          as: 'children',
          required: true,
        }
      ],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        rootCategories,
        categoriesWithChildren
      }
    });

  } catch (error) {
    logger.error('Error getting category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category statistics',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Helper function to check if a category is a descendant of another
 */
async function checkIfDescendant(categoryId: number, potentialAncestorId: number): Promise<boolean> {
  const category = await Category.findByPk(categoryId, {
    include: [
      {
        model: Category,
        as: 'children',
        required: false,
      }
    ]
  });

  if (!category) return false;

  // Check if potential ancestor is in the children tree
  const checkChildren = async (children: Category[]): Promise<boolean> => {
    for (const child of children) {
      if (child.id === potentialAncestorId) {
        return true;
      }
      const childWithChildren = await Category.findByPk(child.id, {
        include: [
          {
            model: Category,
            as: 'children',
            required: false,
          }
        ]
      });
      if (childWithChildren?.children && await checkChildren(childWithChildren.children)) {
        return true;
      }
    }
    return false;
  };

  return category.children ? await checkChildren(category.children) : false;
}
