import { logger } from '../utils/logger';
import { Category, CategoryCreationAttributes } from '../models/categoryModel';
import { Op } from 'sequelize';

/**
 * Category Seeder
 * Seeds the database with initial category data
 */

export interface CategorySeedData {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: number;
  status: 'active' | 'inactive';
  sortOrder: number;
  children?: CategorySeedData[];
}

const categorySeedData: CategorySeedData[] = [
  {
    name: 'Apparel',
    slug: 'apparel',
    description: 'Clothing and apparel items',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop',
    status: 'active',
    sortOrder: 1,
    children: [
      {
        name: 'T-Shirts',
        slug: 'tshirts',
        description: 'Custom t-shirts and tees',
        status: 'active',
        sortOrder: 1,
      },
      {
        name: 'Hoodies',
        slug: 'hoodies',
        description: 'Custom hoodies and sweatshirts',
        status: 'active',
        sortOrder: 2,
      },
      {
        name: 'Polo Shirts',
        slug: 'polo-shirts',
        description: 'Custom polo shirts',
        status: 'active',
        sortOrder: 3,
      },
      {
        name: 'Long Sleeve Tees',
        slug: 'long-sleeve-tees',
        description: 'Custom long sleeve t-shirts',
        status: 'active',
        sortOrder: 4,
      },
      {
        name: 'Zip Hoodies',
        slug: 'zip-hoodies',
        description: 'Custom zip-up hoodies',
        status: 'active',
        sortOrder: 5,
      },
      {
        name: 'Vintage Tees',
        slug: 'vintage-tees',
        description: 'Vintage style custom t-shirts',
        status: 'active',
        sortOrder: 6,
      },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Custom accessories and gear',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop',
    status: 'active',
    sortOrder: 2,
    children: [
      {
        name: 'Caps',
        slug: 'caps',
        description: 'Custom baseball caps and snapbacks',
        status: 'active',
        sortOrder: 1,
      },
      {
        name: 'Trucker Caps',
        slug: 'trucker-caps',
        description: 'Custom trucker caps',
        status: 'active',
        sortOrder: 2,
      },
      {
        name: 'Tote Bags',
        slug: 'tote-bags',
        description: 'Custom tote bags',
        status: 'active',
        sortOrder: 3,
      },
      {
        name: 'Crossbody Bags',
        slug: 'crossbody-bags',
        description: 'Custom crossbody bags',
        status: 'active',
        sortOrder: 4,
      },
      {
        name: 'Drawstring Bags',
        slug: 'drawstring-bags',
        description: 'Custom drawstring bags',
        status: 'active',
        sortOrder: 5,
      },
    ],
  },
];

/**
 * Seeds categories into the database
 */
export async function seedCategories(): Promise<void> {
  try {
    logger.info('🌱 Starting category seeding...');

    // Clear existing data first (products then categories to avoid foreign key constraint)
    const { clearProducts } = await import('./productSeeder');
    await clearProducts();
    await clearCategories();

    // Create categories with hierarchy
    const createdCategories = await createCategoryHierarchy(categorySeedData);

    logger.info(`✅ Successfully seeded ${createdCategories.length} categories`);
    
    // Log category structure
    await logCategoryStructure();

  } catch (error) {
    logger.error('❌ Error seeding categories:', error);
    throw error;
  }
}

/**
 * Creates category hierarchy recursively
 */
async function createCategoryHierarchy(
  categories: CategorySeedData[],
  parentId?: number
): Promise<Category[]> {
  const createdCategories: Category[] = [];

  for (const categoryData of categories) {
    try {
      const categoryAttributes: CategoryCreationAttributes = {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        image: categoryData.image,
        parentId: parentId,
        status: categoryData.status,
        sortOrder: categoryData.sortOrder,
      };

      const category = await Category.create(categoryAttributes);
      createdCategories.push(category);

      logger.info(`   ✓ Created category: ${category.name} (ID: ${category.id})`);

      // Create children if they exist
      if (categoryData.children && categoryData.children.length > 0) {
        const children = await createCategoryHierarchy(categoryData.children, category.id);
        createdCategories.push(...children);
      }

    } catch (error) {
      logger.error(`❌ Error creating category ${categoryData.name}:`, error);
      throw error;
    }
  }

  return createdCategories;
}

/**
 * Clears all categories from the database
 */
export async function clearCategories(): Promise<void> {
  try {
    logger.info('🧹 Clearing existing categories...');
    
    // Delete all categories (cascade will handle children)
    const deletedCount = await Category.destroy({
      where: {},
      force: true, // Hard delete
    });

    logger.info(`   ✓ Cleared ${deletedCount} categories`);
  } catch (error) {
    logger.error('❌ Error clearing categories:', error);
    throw error;
  }
}

/**
 * Logs the category structure for verification
 */
async function logCategoryStructure(): Promise<void> {
  try {
    const rootCategories = await Category.findAll({
      where: { parentId: { [Op.is]: null } } as any,
      include: [
        {
          model: Category,
          as: 'children',
          required: false,
          order: [['sortOrder', 'ASC']],
        },
      ],
      order: [['sortOrder', 'ASC']],
    });

    logger.info('📊 Category Structure:');
    for (const root of rootCategories) {
      logger.info(`   • ${root.name} (${root.slug})`);
      if (root.children && root.children.length > 0) {
        for (const child of root.children) {
          logger.info(`     └── ${child.name} (${child.slug})`);
        }
      }
    }
  } catch (error) {
    logger.warn('⚠️ Could not log category structure:', error);
  }
}

/**
 * Gets category statistics
 */
export async function getCategoryStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  withChildren: number;
}> {
  try {
    const total = await Category.count();
    const active = await Category.count({ where: { status: 'active' } });
    const inactive = await Category.count({ where: { status: 'inactive' } });
    const withChildren = await Category.count({
      include: [
        {
          model: Category,
          as: 'children',
          required: true,
        },
      ],
    });

    return { total, active, inactive, withChildren };
  } catch (error) {
    logger.error('❌ Error getting category stats:', error);
    throw error;
  }
}
