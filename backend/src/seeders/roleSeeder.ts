import { Role } from '../models/roleModel';
import { logger } from '../utils/logger';

/**
 * Role Seeder - Creates all user roles with their permissions
 * This seeder defines the role-based access control (RBAC) structure
 */

export const roleData = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      // User Management
      'users:read', 'users:write', 'users:delete', 'users:manage',
      // Role Management
      'roles:read', 'roles:write', 'roles:delete', 'roles:manage',
      // Product Management
      'products:read', 'products:write', 'products:delete', 'products:manage',
      // Category Management
      'categories:read', 'categories:write', 'categories:delete', 'categories:manage',
      // Order Management
      'orders:read', 'orders:write', 'orders:delete', 'orders:manage',
      // Customer Management
      'customers:read', 'customers:write', 'customers:delete', 'customers:manage',
      // Analytics & Reports
      'analytics:read', 'reports:read', 'reports:write',
      // System Settings
      'settings:read', 'settings:write', 'settings:manage',
      // Content Management
      'content:read', 'content:write', 'content:delete', 'content:manage',
      // Support & Communication
      'support:read', 'support:write', 'support:manage',
      'messages:read', 'messages:write', 'messages:manage',
      // Inventory Management
      'inventory:read', 'inventory:write', 'inventory:manage',
      // Reviews & Feedback
      'reviews:read', 'reviews:write', 'reviews:delete', 'reviews:manage',
      // Embroidery Management
      'embroidery:read', 'embroidery:write', 'embroidery:delete', 'embroidery:manage',
      // FAQ Management
      'faq:read', 'faq:write', 'faq:delete', 'faq:manage'
    ],
    isActive: true,
    isSystem: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Standard customer with basic shopping permissions',
    permissions: [
      // Product Access
      'products:read',
      // Order Management
      'orders:read', 'orders:write', 'orders:create',
      // Profile Management
      'profile:read', 'profile:write',
      // Reviews & Feedback
      'reviews:read', 'reviews:write',
      // Cart & Wishlist
      'cart:read', 'cart:write', 'cart:delete',
      'wishlist:read', 'wishlist:write', 'wishlist:delete',
      // Customization
      'customization:read', 'customization:write',
      // Support
      'support:read', 'support:write',
      // Messages
      'messages:read', 'messages:write'
    ],
    isActive: true,
    isSystem: true
  },
  {
    name: 'support',
    displayName: 'Support Agent',
    description: 'Customer support with limited admin access',
    permissions: [
      // Customer Management
      'customers:read', 'customers:write',
      // Order Management
      'orders:read', 'orders:write',
      // Support & Communication
      'support:read', 'support:write', 'support:manage',
      'messages:read', 'messages:write', 'messages:manage',
      // Product Access
      'products:read',
      // Reviews & Feedback
      'reviews:read', 'reviews:write',
      // FAQ Management
      'faq:read', 'faq:write',
      // Profile Management
      'profile:read', 'profile:write'
    ],
    isActive: true,
    isSystem: true
  },
  {
    name: 'manager',
    displayName: 'Store Manager',
    description: 'Store management with product and order oversight',
    permissions: [
      // Product Management
      'products:read', 'products:write', 'products:manage',
      // Category Management
      'categories:read', 'categories:write', 'categories:manage',
      // Order Management
      'orders:read', 'orders:write', 'orders:manage',
      // Customer Management
      'customers:read', 'customers:write',
      // Inventory Management
      'inventory:read', 'inventory:write', 'inventory:manage',
      // Analytics & Reports
      'analytics:read', 'reports:read',
      // Reviews & Feedback
      'reviews:read', 'reviews:write', 'reviews:manage',
      // Embroidery Management
      'embroidery:read', 'embroidery:write', 'embroidery:manage',
      // FAQ Management
      'faq:read', 'faq:write', 'faq:manage',
      // Support
      'support:read', 'support:write',
      // Messages
      'messages:read', 'messages:write',
      // Profile Management
      'profile:read', 'profile:write'
    ],
    isActive: true,
    isSystem: true
  },
  {
    name: 'designer',
    displayName: 'Designer',
    description: 'Product designer with creative permissions',
    permissions: [
      // Product Management
      'products:read', 'products:write',
      // Category Management
      'categories:read', 'categories:write',
      // Embroidery Management
      'embroidery:read', 'embroidery:write', 'embroidery:manage',
      // Content Management
      'content:read', 'content:write',
      // Customization
      'customization:read', 'customization:write', 'customization:manage',
      // Reviews & Feedback
      'reviews:read',
      // Profile Management
      'profile:read', 'profile:write'
    ],
    isActive: true,
    isSystem: true
  },
  {
    name: 'moderator',
    displayName: 'Content Moderator',
    description: 'Content moderation and community management',
    permissions: [
      // Reviews & Feedback
      'reviews:read', 'reviews:write', 'reviews:delete', 'reviews:manage',
      // Content Management
      'content:read', 'content:write', 'content:delete',
      // FAQ Management
      'faq:read', 'faq:write', 'faq:manage',
      // Support
      'support:read', 'support:write',
      // Messages
      'messages:read', 'messages:write', 'messages:manage',
      // Customer Management (limited)
      'customers:read',
      // Profile Management
      'profile:read', 'profile:write'
    ],
    isActive: true,
    isSystem: true
  }
];

export async function seedRoles(): Promise<void> {
  try {
    logger.info('🌱 Starting role seeding...');

    // Create or update roles (don't clear existing ones to avoid foreign key issues)
    for (const roleDataItem of roleData) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleDataItem.name },
        defaults: roleDataItem
      });

      if (!created) {
        // Update existing role
        await role.update(roleDataItem);
        logger.info(`✅ Updated role: ${roleDataItem.name}`);
      } else {
        logger.info(`✅ Created role: ${roleDataItem.name}`);
      }
    }

    logger.info('🎉 Role seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Error seeding roles:', error);
    throw error;
  }
}

export async function clearRoles(): Promise<void> {
  try {
    logger.info('🧹 Clearing non-system roles...');
    
    // First, try to clear only non-system roles
    await Role.destroy({
      where: {
        isSystem: false
      }
    });
    
    logger.info('✅ Non-system roles cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing roles:', error);
    throw error;
  }
}
