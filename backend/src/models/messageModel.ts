import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MessageAttributes {
  id: number;
  customerId: number;
  sender: 'user' | 'admin';
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageCreationAttributes = Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'>;

export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public customerId!: number;
  public sender!: 'user' | 'admin';
  public text!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'customer_id',
    },
    sender: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
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


