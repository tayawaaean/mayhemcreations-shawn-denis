import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface FAQAttributes {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface FAQCreationAttributes extends Optional<FAQAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FAQ extends Model<FAQAttributes, FAQCreationAttributes> implements FAQAttributes {
  public id!: number;
  public question!: string;
  public answer!: string;
  public category!: string;
  public sortOrder!: number;
  public status!: 'active' | 'inactive';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the model
FAQ.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000],
      },
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000],
      },
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
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
    modelName: 'FAQ',
    tableName: 'faqs',
    timestamps: true,
    underscored: false, // Use camelCase instead of snake_case
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['sortOrder'],
      },
      {
        fields: ['status', 'category', 'sortOrder'],
      },
    ],
  }
);

export default FAQ;
