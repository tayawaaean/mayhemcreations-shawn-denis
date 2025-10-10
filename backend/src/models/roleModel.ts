import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the Role attributes interface
export interface RoleAttributes {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  permissions: string[]; // Array of permission strings
  isActive: boolean;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the creation attributes (optional fields for creation)
export interface RoleCreationAttributes extends Optional<RoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Define the Role model class
export class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public displayName?: string;
  public description?: string;
  public permissions!: string[];
  public isActive!: boolean;
  public isSystem?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the Role model
Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: false, // Temporarily disabled
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidPermissions(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('Permissions must be an array');
          }
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    // Indexes are managed manually to prevent duplicate key errors
    indexes: [], // Temporarily disabled to fix "too many keys" error
  }
);

// Define role constants for easier management
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  CUSTOMER: 'customer',
  SELLER: 'seller',
} as const;

// Define permission constants
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  
  // Product management
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',
  
  // Order management
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_DELETE: 'orders:delete',
  
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  
  // System settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.ANALYTICS_READ,
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_READ,
  ],
  [ROLES.CUSTOMER]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.ORDERS_READ,
  ],
  [ROLES.SELLER]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_WRITE,
    PERMISSIONS.ORDERS_READ,
  ],
};
