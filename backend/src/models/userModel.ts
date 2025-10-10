import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';

// Define the User attributes interface
export interface UserAttributes {
  id: number;
  email: string;
  password?: string; // Made optional for OAuth-only accounts
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
  avatar?: string; // Added for OAuth avatar support
  loginMethod: 'password' | 'oauth' | 'both'; // Track how user can login
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the creation attributes (optional fields for creation)
export interface UserCreationAttributes extends Optional<UserAttributes, 
  'id' | 'password' | 'isEmailVerified' | 'isPhoneVerified' | 'isActive' | 'lastLoginAt' | 
  'failedLoginAttempts' | 'lockedUntil' | 'passwordResetToken' | 'passwordResetExpires' |
  'emailVerificationToken' | 'emailVerificationExpires' | 'avatar' | 'loginMethod' | 'createdAt' | 'updatedAt'
> {}

// Define the User model class
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password?: string; // Made optional for OAuth-only accounts
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
  public avatar?: string; // Added for OAuth avatar support
  public loginMethod!: 'password' | 'oauth' | 'both'; // Track how user can login
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance method to check if account is locked
  public isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // Instance method to check password
  public async checkPassword(candidatePassword: string): Promise<boolean> {
    if (!candidatePassword || !this.password) {
      return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Instance method to hash password with secure salt rounds
  public async hashPassword(): Promise<void> {
    if (!this.password) {
      throw new Error('Password is required for hashing');
    }
    
    // Use 12 salt rounds for production security (higher than default 10)
    // This provides good security while maintaining reasonable performance
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    
    // Validate salt rounds are within safe range
    if (saltRounds < 10 || saltRounds > 15) {
      throw new Error('Salt rounds must be between 10 and 15');
    }
    
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  // Static method to validate password strength
  public static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be no more than 128 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak patterns (exact matches or standalone words)
    const commonPasswords = ['password', '123456', 'qwerty', 'letmein'];
    const weakPatterns = [
      /^admin$/i,           // exact match "admin"
      /^password$/i,        // exact match "password"
      /^123456$/i,          // exact match "123456"
      /^qwerty$/i,          // exact match "qwerty"
      /^letmein$/i,         // exact match "letmein"
    ];
    
    if (commonPasswords.some(common => password.toLowerCase() === common) ||
        weakPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common weak patterns');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  // Check if password needs rehashing (for security updates)
  public needsPasswordRehash(): boolean {
    if (!this.password) return false;
    
    // Check if password was hashed with lower salt rounds
    // bcrypt hashes start with $2b$ followed by the cost parameter
    const hashParts = this.password.split('$');
    if (hashParts.length !== 4 || hashParts[1] !== '2b') return true;
    
    const currentSaltRounds = parseInt(hashParts[2], 10);
    const requiredSaltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    
    return currentSaltRounds < requiredSaltRounds;
  }

  // Rehash password if needed (for security updates)
  public async rehashPasswordIfNeeded(): Promise<boolean> {
    if (this.needsPasswordRehash()) {
      // We need the original password to rehash, so this should be called
      // during login when we have the plaintext password
      throw new Error('Cannot rehash without original password. Call this during login.');
    }
    return false;
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

  // Static method to find or create user for OAuth
  public static async findOrCreateForOAuth(oauthData: {
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }, roleId: number): Promise<{ user: User; isNewUser: boolean }> {
    // First, try to find existing user by email
    let user = await User.findOne({
      where: { email: oauthData.email }
    });

    let isNewUser = false;

    if (user) {
      // User exists, update login method if needed
      if (user.loginMethod === 'password') {
        user.loginMethod = 'both';
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
        avatar: oauthData.avatar,
        roleId,
        loginMethod: 'oauth',
        isEmailVerified: true, // OAuth emails are pre-verified
        isActive: true,
        failedLoginAttempts: 0
      });
      isNewUser = true;
    }

    return { user, isNewUser };
  }

  // Static method to check if user can login with password
  public static canLoginWithPassword(user: User): boolean {
    return user.loginMethod === 'password' || user.loginMethod === 'both';
  }

  // Static method to check if user can login with OAuth
  public static canLoginWithOAuth(user: User): boolean {
    return user.loginMethod === 'oauth' || user.loginMethod === 'both';
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
      unique: false, // Temporarily disabled
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true, // Made optional for OAuth-only accounts
      validate: {
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
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User avatar URL (from OAuth or uploaded)',
    },
    loginMethod: {
      type: DataTypes.ENUM('password', 'oauth', 'both'),
      allowNull: false,
      defaultValue: 'password',
      comment: 'How the user can login (password, oauth, or both)',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      {
        fields: ['email'],
        unique: true,
      },
      {
        fields: ['role_id'],
      },
      {
        fields: ['is_active'],
      },
    ],
    hooks: {
      // Validate password requirement before creating user
      beforeValidate: (user: User) => {
        // Password is required only if loginMethod is 'password' or 'both'
        if ((user.loginMethod === 'password' || user.loginMethod === 'both') && (!user.password || user.password.length === 0)) {
          throw new Error('Password is required for password-based login methods');
        }
      },
      // Hash password before creating user
      beforeCreate: async (user: User) => {
        if (user.password) {
          // Validate password strength before hashing
          const validation = User.validatePasswordStrength(user.password);
          if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
          }
          await user.hashPassword();
        }
      },
      // Hash password before updating if it changed
      beforeUpdate: async (user: User) => {
        if (user.changed('password') && user.password) {
          // Validate password strength before rehashing
          const validation = User.validatePasswordStrength(user.password);
          if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
          }
          await user.hashPassword();
        }
      },
      // Validate password before saving (additional safety check)
      beforeSave: async (user: User) => {
        if (user.password && user.isNewRecord) {
          // Only validate on new records, updates are handled by beforeUpdate
          const validation = User.validatePasswordStrength(user.password);
          if (!validation.isValid) {
            throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
          }
        }
      },
    },
  }
);

// Note: Virtual field is already defined in the model definition above
