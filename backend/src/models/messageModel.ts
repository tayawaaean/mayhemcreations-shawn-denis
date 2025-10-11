import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MessageAttributes {
  id: number;
  customerId: string; // Changed to string to support both numeric IDs and guest IDs
  sender: 'user' | 'admin';
  text: string | null;
  type?: 'text' | 'image' | 'file';
  attachment?: any | null;
  isGuest?: boolean; // Flag to indicate if message is from a guest user
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageCreationAttributes = Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isGuest'>;

export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public customerId!: string; // Changed to string
  public sender!: 'user' | 'admin';
  public text!: string | null;
  public type?: 'text' | 'image' | 'file';
  public attachment?: any | null;
  public isGuest?: boolean; // Flag for guest users
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.STRING(255), // Changed to STRING to support guest IDs
      allowNull: false,
      field: 'customer_id',
      comment: 'User ID (numeric) or guest ID (guest_xxx)',
      // Removed foreign key constraint to allow guest IDs
    },
    sender: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'file'),
      allowNull: false,
      defaultValue: 'text',
    },
    attachment: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isGuest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_guest',
      comment: 'True if message is from a guest user',
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    underscored: true,
  }
);

export default Message;


