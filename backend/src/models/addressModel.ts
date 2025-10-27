/**
 * Address Model
 * Manages warehouse and business addresses for shipping
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AddressAttributes {
  id: number;
  name: string;
  type: 'origin' | 'return' | 'warehouse';
  is_default: boolean;
  contact_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  residential_indicator: 'yes' | 'no' | 'unknown';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AddressCreationAttributes extends Optional<AddressAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Address extends Model<AddressAttributes, AddressCreationAttributes> implements AddressAttributes {
  public id!: number;
  public name!: string;
  public type!: 'origin' | 'return' | 'warehouse';
  public is_default!: boolean;
  public contact_name!: string;
  public company_name?: string;
  public phone?: string;
  public email?: string;
  public address_line1!: string;
  public address_line2?: string;
  public city!: string;
  public state!: string;
  public postal_code!: string;
  public country!: string;
  public residential_indicator!: 'yes' | 'no' | 'unknown';
  public notes?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Get the default origin address
   */
  static async getDefaultOrigin(): Promise<Address | null> {
    return await Address.findOne({
      where: {
        type: 'origin',
        is_default: true
      }
    });
  }

  /**
   * Get all addresses by type
   */
  static async getByType(type: 'origin' | 'return' | 'warehouse'): Promise<Address[]> {
    return await Address.findAll({
      where: { type },
      order: [['is_default', 'DESC'], ['name', 'ASC']]
    });
  }

  /**
   * Convert to ShipEngine address format
   */
  toShipEngineFormat() {
    return {
      name: this.contact_name,
      phone: this.phone,
      company_name: this.company_name,
      address_line1: this.address_line1,
      address_line2: this.address_line2,
      city_locality: this.city,
      state_province: this.state,
      postal_code: this.postal_code,
      country_code: this.country,
      address_residential_indicator: this.residential_indicator
    };
  }

  /**
   * Get formatted address string
   */
  getFormattedAddress(): string {
    const parts = [
      this.address_line1,
      this.address_line2,
      `${this.city}, ${this.state} ${this.postal_code}`,
      this.country
    ].filter(Boolean);
    
    return parts.join('\n');
  }
}

Address.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Display name for the address'
    },
    type: {
      type: DataTypes.ENUM('origin', 'return', 'warehouse'),
      allowNull: false,
      comment: 'Type of address'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this is the default address for its type'
    },
    contact_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Contact person name'
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Company or business name'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Phone number'
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Email address'
    },
    address_line1: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Primary address line'
    },
    address_line2: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Secondary address line (apartment, suite, etc.)'
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'City'
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'State or province'
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Postal or ZIP code'
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'US',
      comment: 'Country code (ISO 3166-1 alpha-2)'
    },
    residential_indicator: {
      type: DataTypes.ENUM('yes', 'no', 'unknown'),
      allowNull: false,
      defaultValue: 'no',
      comment: 'Whether this is a residential address'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the address'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'addresses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['type', 'is_default']
      },
      {
        fields: ['type']
      }
    ]
  }
);

export default Address;
