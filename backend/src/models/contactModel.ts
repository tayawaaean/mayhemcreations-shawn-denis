import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the contact interface for TypeScript type checking
export interface ContactAttributes {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  projectType: string;
  quantity?: string | null;
  message: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

// Define optional fields for creation (id, timestamps auto-generated)
export interface ContactCreationAttributes extends Optional<ContactAttributes, 'id' | 'phone' | 'company' | 'quantity' | 'status' | 'createdAt' | 'updatedAt'> {}

// Define the Contact model class
class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public company!: string | null;
  public projectType!: string;
  public quantity!: string | null;
  public message!: string;
  public status!: 'new' | 'read' | 'responded' | 'archived';
  
  // Timestamps are automatically managed by Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the Contact model with schema definition
Contact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      comment: 'Unique identifier for the contact submission'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Full name of the person submitting the contact form'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
      comment: 'Email address for contact'
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Optional phone number for contact'
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Optional company or organization name'
    },
    projectType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Type of project or inquiry (e.g., T-Shirts, Caps, etc.)'
    },
    quantity: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Estimated quantity for the project'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed message or inquiry from the contact'
    },
    status: {
      type: DataTypes.ENUM('new', 'read', 'responded', 'archived'),
      defaultValue: 'new',
      allowNull: false,
      comment: 'Current status of the contact inquiry'
    }
  },
  {
    sequelize,
    tableName: 'contacts',
    modelName: 'Contact',
    timestamps: true,
    indexes: [
      // Index for filtering by status (admin viewing)
      {
        name: 'idx_contacts_status',
        fields: ['status'],
      },
      // Index for filtering by email (checking duplicates)
      {
        name: 'idx_contacts_email',
        fields: ['email'],
      },
    ],
  }
);

export default Contact;

