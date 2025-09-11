import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Define the OAuth Provider attributes interface
export interface OAuthProviderAttributes {
  id: number;
  userId: number;
  provider: string; // 'google', 'facebook', 'apple', etc.
  providerId: string; // The ID from the OAuth provider
  email: string; // Email from OAuth provider (for verification)
  firstName?: string;
  lastName?: string;
  avatar?: string;
  accessToken?: string; // Encrypted OAuth access token
  refreshToken?: string; // Encrypted OAuth refresh token
  tokenExpiresAt?: Date;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the creation attributes
export interface OAuthProviderCreationAttributes extends Optional<OAuthProviderAttributes, 
  'id' | 'firstName' | 'lastName' | 'avatar' | 'accessToken' | 'refreshToken' | 
  'tokenExpiresAt' | 'isActive' | 'lastUsedAt' | 'createdAt' | 'updatedAt'
> {}

// Define the OAuth Provider model class
export class OAuthProvider extends Model<OAuthProviderAttributes, OAuthProviderCreationAttributes> implements OAuthProviderAttributes {
  public id!: number;
  public userId!: number;
  public provider!: string;
  public providerId!: string;
  public email!: string;
  public firstName?: string;
  public lastName?: string;
  public avatar?: string;
  public accessToken?: string;
  public refreshToken?: string;
  public tokenExpiresAt?: Date;
  public isActive!: boolean;
  public lastUsedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async updateLastUsed(): Promise<void> {
    this.lastUsedAt = new Date();
    await this.save();
  }

  public async deactivate(): Promise<void> {
    this.isActive = false;
    await this.save();
  }

  // Static methods
  public static async findByProviderAndId(provider: string, providerId: string): Promise<OAuthProvider | null> {
    return await this.findOne({
      where: { provider, providerId, isActive: true }
    });
  }

  public static async findByEmail(email: string): Promise<OAuthProvider[]> {
    return await this.findAll({
      where: { email, isActive: true }
    });
  }

  public static async findByUserId(userId: number): Promise<OAuthProvider[]> {
    return await this.findAll({
      where: { userId, isActive: true }
    });
  }

  public static async linkToUser(userId: number, providerData: OAuthProviderCreationAttributes): Promise<OAuthProvider> {
    return await this.create({
      ...providerData,
      userId
    });
  }
}

// Initialize the model
OAuthProvider.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'OAuth provider name (google, facebook, apple, etc.)'
  },
  providerId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'provider_id',
    comment: 'Unique ID from the OAuth provider'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Email from OAuth provider for account linking'
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'first_name',
    comment: 'First name from OAuth provider'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'last_name',
    comment: 'Last name from OAuth provider'
  },
  avatar: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Avatar URL from OAuth provider'
  },
  accessToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'access_token',
    comment: 'Encrypted OAuth access token'
  },
  refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refresh_token',
    comment: 'Encrypted OAuth refresh token'
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'token_expires_at',
    comment: 'OAuth token expiration time'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'is_active',
    defaultValue: true,
    comment: 'Whether this OAuth provider link is active'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used_at',
    comment: 'Last time this OAuth provider was used for login'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'OAuthProvider',
  tableName: 'oauth_providers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['provider', 'provider_id'],
      name: 'unique_provider_id'
    },
    {
      fields: ['user_id'],
      name: 'idx_oauth_providers_user_id'
    },
    {
      fields: ['email'],
      name: 'idx_oauth_providers_email'
    }
  ]
});

export default OAuthProvider;
