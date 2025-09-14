import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface EmbroideryOptionAttributes {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string; // Base64 encoded image
  stitches: number;
  estimatedTime: string;
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting';
  level: 'basic' | 'standard' | 'premium' | 'luxury';
  isPopular: boolean;
  isActive: boolean;
  isIncompatible?: string; // JSON string of incompatible option IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbroideryOptionCreationAttributes extends Optional<EmbroideryOptionAttributes, 'id' | 'isIncompatible' | 'createdAt' | 'updatedAt'> {}

class EmbroideryOption extends Model<EmbroideryOptionAttributes, EmbroideryOptionCreationAttributes> implements EmbroideryOptionAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public price!: number;
  public image!: string;
  public stitches!: number;
  public estimatedTime!: string;
  public category!: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting';
  public level!: 'basic' | 'standard' | 'premium' | 'luxury';
  public isPopular!: boolean;
  public isActive!: boolean;
  public isIncompatible?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to get incompatible options as array
  getIncompatibleOptions(): string[] {
    if (!this.isIncompatible) return [];
    try {
      return JSON.parse(this.isIncompatible);
    } catch {
      return [];
    }
  }

  // Helper method to set incompatible options
  setIncompatibleOptions(options: string[]): void {
    this.isIncompatible = JSON.stringify(options);
  }
}

EmbroideryOption.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    image: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    stitches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estimatedTime: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '0 days',
    },
    category: {
      type: DataTypes.ENUM('coverage', 'threads', 'material', 'border', 'backing', 'upgrades', 'cutting'),
      allowNull: false,
    },
    level: {
      type: DataTypes.ENUM('basic', 'standard', 'premium', 'luxury'),
      allowNull: false,
      defaultValue: 'basic',
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isIncompatible: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'EmbroideryOption',
    tableName: 'embroidery_options',
    timestamps: true,
  }
);

export { EmbroideryOption };
