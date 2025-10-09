import { sequelize } from '../config/database';
import { User, UserAttributes, UserCreationAttributes } from './userModel';
import { Role, RoleAttributes, RoleCreationAttributes, ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './roleModel';
import { Session, SessionAttributes, SessionCreationAttributes } from './sessionModel';
import { OAuthProvider, OAuthProviderAttributes, OAuthProviderCreationAttributes } from './oauthProviderModel';
import { Category, CategoryAttributes, CategoryCreationAttributes } from './categoryModel';
import Product, { ProductAttributes, ProductCreateAttributes } from './productModel';
import Variant, { VariantAttributes, VariantCreationAttributes } from './variantModel';
import { EmbroideryOption, EmbroideryOptionAttributes, EmbroideryOptionCreationAttributes } from './embroideryOptionModel';
import { Cart, CartAttributes, CartCreationAttributes } from './cartModel';
import { FAQ, FAQAttributes, FAQCreationAttributes } from './faqModel';
import { CustomEmbroidery, CustomEmbroideryAttributes, CustomEmbroideryCreationAttributes } from './customEmbroideryModel';
import Message, { MessageAttributes, MessageCreationAttributes } from './messageModel';
import { OrderReview, OrderReviewAttributes, OrderReviewCreationAttributes } from './orderReviewModel';
import { Payment, PaymentAttributes, PaymentCreationAttributes } from './paymentModel';

// Define model associations
const setupAssociations = (): void => {
  // User belongs to Role
  User.belongsTo(Role, {
    foreignKey: 'roleId',
    as: 'role',
  });

  // Role has many Users
  Role.hasMany(User, {
    foreignKey: 'roleId',
    as: 'users',
  });

  // User has many Sessions
  User.hasMany(Session, {
    foreignKey: 'userId',
    as: 'sessions',
  });

  // Session belongs to User
  Session.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many OAuth Providers
  User.hasMany(OAuthProvider, {
    foreignKey: 'userId',
    as: 'oauthProviders',
  });

  // OAuth Provider belongs to User
  OAuthProvider.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Category self-referencing associations are defined in the model file

  // Product belongs to Category (parent category)
  Product.belongsTo(Category, {
    foreignKey: 'categoryId',
    as: 'category',
  });

  // Category has many Products
  Category.hasMany(Product, {
    foreignKey: 'categoryId',
    as: 'products',
  });

  // Product belongs to Category (subcategory)
  Product.belongsTo(Category, {
    foreignKey: 'subcategoryId',
    as: 'subcategory',
  });

  // Category has many Products as subcategory
  Category.hasMany(Product, {
    foreignKey: 'subcategoryId',
    as: 'subcategoryProducts',
  });

  // Variant belongs to Product
  Variant.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
  });

  // Product has many Variants
  Product.hasMany(Variant, {
    foreignKey: 'productId',
    as: 'variants',
  });

  // User has many Cart items
  User.hasMany(Cart, {
    foreignKey: 'userId',
    as: 'cartItems',
  });

  // Cart belongs to User
  Cart.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Note: Cart-Product associations removed to support mixed productId types
  // (integer for products, string for custom items like 'custom-embroidery')
  // Product validation is handled at the application level in cartController

  // User has many Custom Embroidery orders
  User.hasMany(CustomEmbroidery, {
    foreignKey: 'userId',
    as: 'customEmbroideryOrders',
  });

  // Custom Embroidery belongs to User
  CustomEmbroidery.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Message belongs to User (customer)
  Message.belongsTo(User, {
    foreignKey: 'customerId',
    as: 'customer',
  });

  // User has many Messages
  User.hasMany(Message, {
    foreignKey: 'customerId',
    as: 'messages',
  });

  // OrderReview belongs to User
  OrderReview.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // User has many OrderReviews
  User.hasMany(OrderReview, {
    foreignKey: 'userId',
    as: 'orderReviews',
  });

  // Payment belongs to OrderReview
  Payment.belongsTo(OrderReview, {
    foreignKey: 'orderId',
    as: 'order',
  });

  // OrderReview has many Payments
  OrderReview.hasMany(Payment, {
    foreignKey: 'orderId',
    as: 'payments',
  });

  // Payment belongs to User (customer)
  Payment.belongsTo(User, {
    foreignKey: 'customerId',
    as: 'customer',
  });

  // User has many Payments
  User.hasMany(Payment, {
    foreignKey: 'customerId',
    as: 'payments',
  });
};

// Initialize associations
setupAssociations();

// Export models and types
export {
  sequelize,
  User,
  UserAttributes,
  UserCreationAttributes,
  Role,
  RoleAttributes,
  RoleCreationAttributes,
  ROLES,
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  Session,
  SessionAttributes,
  SessionCreationAttributes,
  OAuthProvider,
  OAuthProviderAttributes,
  OAuthProviderCreationAttributes,
  Category,
  CategoryAttributes,
  CategoryCreationAttributes,
  Product,
  ProductAttributes,
  ProductCreateAttributes,
  Variant,
  VariantAttributes,
  VariantCreationAttributes,
  EmbroideryOption,
  EmbroideryOptionAttributes,
  EmbroideryOptionCreationAttributes,
  Cart,
  CartAttributes,
  CartCreationAttributes,
  FAQ,
  FAQAttributes,
  FAQCreationAttributes,
  CustomEmbroidery,
  Message,
  OrderReview,
  CustomEmbroideryAttributes,
  CustomEmbroideryCreationAttributes,
  MessageAttributes,
  MessageCreationAttributes,
  OrderReviewAttributes,
  OrderReviewCreationAttributes,
  Payment,
  PaymentAttributes,
  PaymentCreationAttributes,
};

// Export all models for easy access
export const models = {
  User,
  Role,
  Session,
  OAuthProvider,
  Category,
  Product,
  Variant,
  EmbroideryOption,
  Cart,
  FAQ,
  CustomEmbroidery,
  Message,
  OrderReview,
  Payment,
};

// Database synchronization function
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

// Database connection test
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};
