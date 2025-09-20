import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { FAQ } from '../models/faqModel';
import { logger } from '../utils/logger';

export interface FAQFilters {
  status?: 'active' | 'inactive';
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/**
 * Get all FAQs with optional filtering and pagination
 */
export const getFAQs = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('FAQ Controller: Starting getFAQs');
    
    const {
      status = 'active',
      category,
      search,
      sortBy = 'sortOrder',
      sortOrder = 'ASC',
      page = 1,
      limit = 50
    } = req.query;

    const filters: FAQFilters = {
      status: status as 'active' | 'inactive',
      category: category as string,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
      page: Number(page) || 1,
      limit: Number(limit) || 50
    };

    // Build where clause
    const whereClause: any = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.category) {
      whereClause.category = filters.category;
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { question: { [Op.iLike]: `%${filters.search}%` } },
        { answer: { [Op.iLike]: `%${filters.search}%` } },
        { category: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const offset = (filters.page! - 1) * filters.limit!;

    logger.info('FAQ Controller: About to query database', { whereClause, filters });

    const { count, rows: faqs } = await FAQ.findAndCountAll({
      where: whereClause,
      order: [['sortOrder', 'ASC']],
      limit: filters.limit!,
      offset: offset
    });

    const totalPages = Math.ceil(count / filters.limit!);

    logger.info(`Retrieved ${faqs.length} FAQs (${count} total)`);

    res.json({
      success: true,
      data: faqs,
      pagination: {
        page: filters.page!,
        limit: filters.limit!,
        total: count,
        pages: totalPages,
        hasNext: filters.page! < totalPages,
        hasPrev: filters.page! > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching FAQs:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQs',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get a single FAQ by ID
 */
export const getFAQById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByPk(parseInt(id));

    if (!faq) {
      res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
      return;
    }

    logger.info(`Retrieved FAQ: ${faq.question}`);

    res.json({
      success: true,
      data: faq
    });

  } catch (error) {
    logger.error('Error fetching FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Create a new FAQ
 */
export const createFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const faqData = req.body;

    // Validate required fields
    if (!faqData.question || !faqData.answer || !faqData.category) {
      res.status(400).json({
        success: false,
        message: 'Question, answer, and category are required'
      });
      return;
    }

    // Get the next sort order for the category
    const lastFAQ = await FAQ.findOne({
      where: { category: faqData.category },
      order: [['sortOrder', 'DESC']]
    });

    const nextSortOrder = lastFAQ ? lastFAQ.sortOrder + 1 : 1;

    const faq = await FAQ.create({
      ...faqData,
      sortOrder: faqData.sortOrder || nextSortOrder
    });

    logger.info(`Created FAQ: ${faq.question} (ID: ${faq.id})`);

    res.status(201).json({
      success: true,
      data: faq,
      message: 'FAQ created successfully'
    });

  } catch (error) {
    logger.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create FAQ',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update an existing FAQ
 */
export const updateFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const faq = await FAQ.findByPk(parseInt(id));

    if (!faq) {
      res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
      return;
    }

    await faq.update(updateData);

    logger.info(`Updated FAQ: ${faq.question} (ID: ${faq.id})`);

    res.json({
      success: true,
      data: faq,
      message: 'FAQ updated successfully'
    });

  } catch (error) {
    logger.error('Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Delete an FAQ
 */
export const deleteFAQ = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByPk(parseInt(id));

    if (!faq) {
      res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
      return;
    }

    await faq.destroy();

    logger.info(`Deleted FAQ: ${faq.question} (ID: ${faq.id})`);

    res.json({
      success: true,
      message: 'FAQ deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete FAQ',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Update FAQ sort order
 */
export const updateFAQsOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { faqs } = req.body;

    if (!Array.isArray(faqs)) {
      res.status(400).json({
        success: false,
        message: 'FAQs array is required'
      });
      return;
    }

    // Update sort order for each FAQ
    for (const faqData of faqs) {
      await FAQ.update(
        { sortOrder: faqData.sortOrder },
        { where: { id: faqData.id } }
      );
    }

    logger.info(`Updated sort order for ${faqs.length} FAQs`);

    res.json({
      success: true,
      message: 'FAQ order updated successfully'
    });

  } catch (error) {
    logger.error('Error updating FAQ order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FAQ order',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Get FAQ categories
 */
export const getFAQCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await FAQ.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(cat => cat.category);

    logger.info(`Retrieved ${categoryList.length} FAQ categories`);

    res.json({
      success: true,
      data: categoryList
    });

  } catch (error) {
    logger.error('Error fetching FAQ categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ categories',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

/**
 * Toggle FAQ status
 */
export const toggleFAQStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByPk(parseInt(id));

    if (!faq) {
      res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
      return;
    }

    const newStatus = faq.status === 'active' ? 'inactive' : 'active';
    await faq.update({ status: newStatus });

    logger.info(`Toggled FAQ status: ${faq.question} (ID: ${faq.id}) to ${newStatus}`);

    res.json({
      success: true,
      data: faq,
      message: `FAQ ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    logger.error('Error toggling FAQ status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle FAQ status',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
