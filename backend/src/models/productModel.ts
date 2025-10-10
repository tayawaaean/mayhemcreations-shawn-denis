import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductAttributes {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  image: string; // Keep for backward compatibility - will be the primary image
  images?: string[]; // Array of base64 images
  primaryImageIndex?: number; // Index of the primary image in the images array
  alt: string;
  categoryId: number;
  subcategoryId?: number;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  badges?: string[];
  availableColors?: string[];
  availableSizes?: string[];
  averageRating?: number;
  totalReviews?: number;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: string;
  materials?: string[];
  careInstructions?: string;
  hasSizing?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCreateAttributes extends Optional<ProductAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Product extends Model<ProductAttributes, ProductCreateAttributes> implements ProductAttributes {
  public id!: number;
  public title!: string;
  public slug!: string;
  public description!: string;
  public price!: number;
  public image!: string;
  public images?: string[];
  public primaryImageIndex?: number;
  public alt!: string;
  public categoryId!: number;
  public subcategoryId?: number;
  public status!: 'active' | 'inactive' | 'draft';
  public featured!: boolean;
  public badges?: string[];
  public availableColors?: string[];
  public availableSizes?: string[];
  public averageRating?: number;
  public totalReviews?: number;
  public stock?: number;
  public sku?: string;
  public weight?: number;
  public dimensions?: string;
  public materials?: string[];
  public careInstructions?: string;
  public hasSizing?: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  // Associations will be defined after model initialization
  public category?: any;
  public subcategory?: any;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'title',
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: false, // Temporarily disabled
      field: 'slug',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'description',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'price',
    },
    image: {
      type: DataTypes.TEXT('long'), // Use LONGTEXT to handle large base64 images
      allowNull: false,
      field: 'image',
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'images',
      get(): string[] {
        const value = this.getDataValue('images');
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return Array.isArray(value) ? value : [];
      },
      set(value: string[] | undefined) {
        this.setDataValue('images', value);
      }
    },
    primaryImageIndex: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'primary_image_index',
    },
    alt: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'alt',
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    subcategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'subcategory_id',
      references: {
        model: 'categories',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft'),
      allowNull: false,
      defaultValue: 'active',
      field: 'status',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'featured',
    },
    badges: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'badges',
    },
    availableColors: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'available_colors',
    },
    availableSizes: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'available_sizes',
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      field: 'average_rating',
    },
    totalReviews: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: 'total_reviews',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'stock',
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: false, // Temporarily disabled
      field: 'sku',
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: 'weight',
    },
    dimensions: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'dimensions',
    },
    materials: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'materials',
    },
    careInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'care_instructions',
    },
    hasSizing: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'has_sizing',
    },
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [] // Temporarily disabled to fix "too many keys" error
  }
);

export default Product;