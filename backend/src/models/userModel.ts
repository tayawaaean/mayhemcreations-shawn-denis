import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

// Define the User attributes interface
export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  roleId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the creation attributes (optional fields for creation)
export interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'isEmailVerified' | 'isPhoneVerified' | 'isActive' | 'lastLoginAt' | 
  'failedLoginAttempts' | 'lockedUntil' | 'passwordResetToken' | 'passwordResetExpires' |
  'emailVerificationToken' | 'emailVerificationExpires' | 'createdAt' | 'updatedAt'
> {}

// Define the User model class
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public dateOfBirth?: Date;
  public isEmailVerified!: boolean;
  public isPhoneVerified!: boolean;
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public failedLoginAttempts!: number;
  public lockedUntil?: Date;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public emailVerificationToken?: string;
  public emailVerificationExpires?: Date;
  public roleId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to check if account is locked
  public isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // Instance method to check password
  public async checkPassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to hash password
  public async hashPassword(): Promise<void> {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Instance method to increment failed login attempts
  public async incLoginAttempts(): Promise<User> {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockedUntil && this.lockedUntil < new Date()) {
      return this.update({
        failedLoginAttempts: 1,
        lockedUntil: undefined,
      });
    }

    const updates: Partial<UserAttributes> = { failedLoginAttempts: this.failedLoginAttempts + 1 };
    
    // Lock account after 5 failed attempts for 2 hours
    if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
      updates.lockedUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    }

    return this.update(updates);
  }

  // Instance method to reset failed login attempts
  public async resetLoginAttempts(): Promise<User> {
    return this.update({
      failedLoginAttempts: 0,
      lockedUntil: undefined,
    });
  }

  // Virtual field for full name
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

// Initialize the User model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [8, 255],
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[\+]?[1-9][\d]{0,15}$/,
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split('T')[0], // Must be in the past
      },
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isPhoneVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['roleId'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['emailVerificationToken'],
      },
      {
        fields: ['passwordResetToken'],
      },
    ],
    hooks: {
      // Hash password before creating user
      beforeCreate: async (user: User) => {
        if (user.password) {
          await user.hashPassword();
        }
      },
      // Hash password before updating if it changed
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          await user.hashPassword();
        }
      },
    },
  }
);

// Note: Virtual field is already defined in the model definition above
