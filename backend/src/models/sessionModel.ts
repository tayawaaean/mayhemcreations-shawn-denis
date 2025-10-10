import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SessionAttributes {
  id: number;
  sessionId: string;
  userId: number;
  accessToken: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionCreationAttributes extends Optional<SessionAttributes, 'id' | 'userAgent' | 'ipAddress' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: number;
  public sessionId!: string;
  public userId!: number;
  public accessToken!: string;
  public refreshToken!: string;
  public userAgent?: string;
  public ipAddress?: string;
  public isActive!: boolean;
  public expiresAt!: Date;
  public lastActivity!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public isActiveSession(): boolean {
    return this.isActive && !this.isExpired();
  }

  public updateActivity(): Promise<Session> {
    this.lastActivity = new Date();
    return this.save();
  }

  public revoke(): Promise<Session> {
    this.isActive = false;
    return this.save();
  }

  public toJSON(): SessionAttributes {
    const values = Object.assign({}, this.get());
    // Remove sensitive data from JSON output
    const { accessToken, refreshToken, ...safeValues } = values;
    return safeValues as SessionAttributes;
  }
}

Session.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: false, // Temporarily disabled
      field: 'session_id', // Map to snake_case column name
      comment: 'Unique session identifier',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id', // Map to snake_case column name
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to user',
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'access_token', // Map to snake_case column name
      comment: 'JWT access token',
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'refresh_token', // Map to snake_case column name
      comment: 'JWT refresh token',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent', // Map to snake_case column name
      comment: 'User agent string',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address', // Map to snake_case column name
      comment: 'IP address (supports IPv6)',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active', // Map to snake_case column name
      comment: 'Whether session is active',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at', // Map to snake_case column name
      comment: 'Session expiration time',
    },
    lastActivity: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'last_activity', // Map to snake_case column name
      comment: 'Last activity timestamp',
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
    tableName: 'sessions',
    timestamps: true,
    indexes: [], // Temporarily disabled to fix "too many keys" error
        unique: false, // Temporarily disabled
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['is_active'],
      },
      {
        fields: ['user_id', 'is_active'],
      },
    ],
  }
);

export default Session;
