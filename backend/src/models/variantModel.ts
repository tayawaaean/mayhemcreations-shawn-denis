import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Product from './productModel';

export interface VariantAttributes {
  id: number;
  productId: number;
  name: string;
  color?: string;
  colorHex?: string;
  size?: string;
  sku: string;
  stock: number;
  price?: number; // Optional price override for variant
  image?: string; // Optional variant-specific image
  weight?: number;
  dimensions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VariantCreationAttributes extends Optional<VariantAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Variant extends Model<VariantAttributes, VariantCreationAttributes> implements VariantAttributes {
  public id!: number;
  public productId!: number;
  public name!: string;
  public color?: string;
  public colorHex?: string;
  public size?: string;
  public sku!: string;
  public stock!: number;
  public price?: number;
  public image?: string;
  public weight?: number;
  public dimensions?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public product?: Product;
}

Variant.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'name',
    },
    color: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'color',
    },
    colorHex: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'color_hex',
      validate: {
        isHexColor(value: string) {
          if (value && !/^#[0-9A-F]{6}$/i.test(value)) {
            throw new Error('Color hex must be a valid hex color code');
          }
        },
      },
    },
    size: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'size',
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'sku',
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'stock',
      validate: {
        min: 0,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'price',
      validate: {
        min: 0,
      },
    },
    image: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'image',
    },
    weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
      field: 'weight',
      validate: {
        min: 0,
      },
    },
    dimensions: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'dimensions',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'variants',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['product_id'],
      },
      {
        fields: ['sku'],
        unique: true,
      },
      {
        fields: ['is_active'],
      },
    ],
  }
);

// Define associations
// Associations are defined in models/index.ts

export default Variant;
