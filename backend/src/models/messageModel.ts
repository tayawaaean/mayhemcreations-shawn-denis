import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MessageAttributes {
  id: number;
  customerId: number;
  sender: 'user' | 'admin';
  text: string | null;
  type?: 'text' | 'image' | 'file';
  attachment?: any | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageCreationAttributes = Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public customerId!: number;
  public sender!: 'user' | 'admin';
  public text!: string | null;
  public type?: 'text' | 'image' | 'file';
  public attachment?: any | null;
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
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'customer_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION',
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
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    underscored: true,
  }
);

export default Message;


