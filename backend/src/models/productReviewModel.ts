/**
 * ProductReview Model
 * Defines the structure for customer product reviews
 */

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define interface for ProductReview attributes
export interface ProductReviewAttributes {
  id: number;
  productId: number | string; // Support both numeric IDs and string IDs like 'custom-embroidery'
  userId: number;
  orderId: number;
  rating: number;
  title: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  helpfulVotes: number;
  images?: string;
  adminResponse?: string;
  adminRespondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define interface for ProductReview creation attributes (optional fields)
export interface ProductReviewCreationAttributes extends Optional<ProductReviewAttributes, 'id' | 'status' | 'isVerified' | 'helpfulVotes' | 'images' | 'adminResponse' | 'adminRespondedAt' | 'createdAt' | 'updatedAt'> {}

// Define the ProductReview class extending Sequelize Model
export class ProductReview extends Model<ProductReviewAttributes, ProductReviewCreationAttributes> implements ProductReviewAttributes {
  public id!: number;
  public productId!: number | string; // Support both numeric IDs and string IDs like 'custom-embroidery'
  public userId!: number;
  public orderId!: number;
  public rating!: number;
  public title!: string;
  public comment!: string;
  public status!: 'pending' | 'approved' | 'rejected';
  public isVerified!: boolean;
  public helpfulVotes!: number;
  public images?: string;
  public adminResponse?: string;
  public adminRespondedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the ProductReview model
ProductReview.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Primary key for product review',
    },
    productId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'product_id',
      comment: 'Product ID - supports both numeric IDs and string IDs like "custom-embroidery"',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: 'Foreign key to users table',
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      comment: 'Foreign key to order_reviews table (verified purchase)',
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
      comment: 'Rating from 1 to 5 stars',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Review title/headline',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed review text',
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Review approval status',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: 'is_verified',
      comment: 'Whether this is a verified purchase review',
    },
    helpfulVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'helpful_votes',
      comment: 'Number of helpful votes received',
    },
    images: {
      type: DataTypes.TEXT('long'), // LONGTEXT for base64 images
      allowNull: true,
      comment: 'JSON array of review image URLs (base64)',
    },
    adminResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_response',
      comment: 'Optional admin response to review',
    },
    adminRespondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'admin_responded_at',
      comment: 'Timestamp of admin response',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
      comment: 'Timestamp of review creation',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
      comment: 'Timestamp of last update',
    },
  },
  {
    sequelize,
    tableName: 'product_reviews',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_product_reviews_product_id',
        fields: ['product_id'],
      },
      {
        name: 'idx_product_reviews_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_product_reviews_order_id',
        fields: ['order_id'],
      },
      {
        name: 'idx_product_reviews_status',
        fields: ['status'],
      },
      {
        name: 'idx_product_reviews_rating',
        fields: ['rating'],
      },
    ],
  }
);

export default ProductReview;

