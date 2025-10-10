import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the Category attributes interface
export interface CategoryAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: number;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the creation attributes (optional fields for creation)
export interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Define the Category model class
export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description?: string;
  public image?: string;
  public parentId?: number;
  public status!: 'active' | 'inactive';
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Virtual field for children (populated via association)
  public children?: Category[];
  public parent?: Category;
}

// Initialize the Category model
Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: false, // Temporarily disabled
      validate: {
        notEmpty: true,
        len: [1, 120], // Changed from [2, 120] to [1, 120] to allow single character slugs
        isSlug: (value: string) => {
          if (!/^[a-z0-9-]+$/.test(value)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT('long'), // Use LONGTEXT to handle large base64 images
      allowNull: true,
      validate: {
        isValidImage: (value: string) => {
          if (!value) return; // Allow empty values
          
          // Check if it's a valid URL
          const isUrl = /^https?:\/\/.+/.test(value);
          // Check if it's base64 data
          const isBase64 = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(value);
          
          if (!isUrl && !isBase64) {
            throw new Error('Image must be a valid URL or base64 data');
          }
        },
      },
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
      references: {
        model: 'Categories',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: 'Category',
    tableName: 'Categories',
    timestamps: true,
    paranoid: false, // We don't want soft deletes for categories
    indexes: [], // Temporarily disabled to fix "too many keys" error
      },
      {
        fields: ['parent_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['sort_order'],
      },
    ],
  }
);

// Define self-referencing associations
Category.hasMany(Category, {
  foreignKey: 'parentId',
  as: 'children',
  onDelete: 'CASCADE',
});

Category.belongsTo(Category, {
  foreignKey: 'parentId',
  as: 'parent',
});

export default Category;
