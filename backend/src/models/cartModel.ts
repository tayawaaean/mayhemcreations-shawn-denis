/**
 * Cart Model
 * Handles persistent cart storage for users
 */

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import { sequelize } from '../config/database';

export interface CartAttributes {
  id: number;
  userId: number;
  productId: number | string; // Support both integer IDs and string identifiers like 'custom-embroidery'
  quantity: number;
  customization?: string | null; // JSON string of customization data
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs-changes'; // Review status for all cart items
  createdAt: Date;
  updatedAt: Date;
}

export interface CartCreationAttributes extends Optional<CartAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  public id!: number;
  public userId!: number;
  public productId!: number | string;
  public quantity!: number;
  public customization?: string | null;
  public reviewStatus!: 'pending' | 'approved' | 'rejected' | 'needs-changes';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Get customization data as parsed JSON
   */
  public getCustomizationData(): any {
    if (!this.customization) return null;
    try {
      return JSON.parse(this.customization);
    } catch (error) {
      console.error('Error parsing customization data:', error);
      return null;
    }
  }

  /**
   * Set customization data as JSON string
   */
  public setCustomizationData(data: any): void {
    this.customization = data ? JSON.stringify(data) : null;
  }

  /**
   * Convert to JSON with parsed customization
   */
  public toJSON(): CartAttributes & { customizationData?: any } {
    const values = { ...this.get() } as any;
    
    // Parse customization data for JSON response
    if (values.customization) {
      try {
        values.customizationData = JSON.parse(values.customization);
      } catch (error) {
        values.customizationData = null;
      }
    }

    return values;
  }
}

Cart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to user',
    },
    productId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'product_id',
      comment: 'Product ID (integer for products, string for custom items like custom-embroidery)',
      // Note: No foreign key constraint due to mixed data types (INTEGER for products, STRING for custom items)
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'quantity',
      comment: 'Quantity of the product in cart',
      validate: {
        min: 1,
        max: 999,
      },
    },
    customization: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'customization',
      comment: 'JSON string of customization data',
    },
    reviewStatus: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'needs-changes'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'review_status',
      comment: 'Review status for cart items (all items require approval)',
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
    modelName: 'Cart',
    tableName: 'carts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['product_id'],
      },
      {
        unique: true,
        fields: ['user_id', 'product_id', 'customization'],
        name: 'unique_user_product_customization',
      },
    ],
  }
);

export default Cart;
