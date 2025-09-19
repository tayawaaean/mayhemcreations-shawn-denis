# 🌱 Database Seeders - Mayhem Creations Backend

This directory contains database seeders for populating the application with initial data for development and testing. The seeder system now supports **authentication-based seeding** to ensure all business logic and validation rules are properly applied.

## 📁 Structure

```
src/seeders/
├── index.ts              # Main seeder runner and CLI
├── roleSeeder.ts         # Role and permission seeding
├── userSeeder.ts         # User account seeding
├── categorySeeder.ts     # Category hierarchy seeding
├── productSeeder.ts      # Product catalog seeding
├── variantSeeder.ts      # Product variants seeding
├── embroideryOptionSeeder.ts # Embroidery options seeding
├── authSeederService.ts  # Authentication service for seeders
├── apiSeederService.ts   # API-based seeding with authentication
└── SEEDERS_README.md     # This documentation
```

## 🚀 Quick Start

### 🔐 Authentication-Based Seeding (Recommended)
```bash
# Complete seeding with admin authentication
npm run seed:comprehensive:clear -- --use-api

# Seed specific data with authentication
npm run seed:categories -- --use-api
npm run seed:products -- --use-api
npm run seed:variants -- --use-api
npm run seed:embroidery -- --use-api
```

### 📊 Comprehensive Seeding
```bash
# Full database seeding (roles + users + categories + products + variants + embroidery)
npm run seed:comprehensive:clear

# Force recreate tables and seed
npm run seed:force

# Clear existing data and reseed
npm run seed:clear
```

### 🔧 Traditional Seeding (Direct Model Access)
```bash
# Reset entire database and seed
npm run seed:reset

# Seed only roles
npm run seed:roles

# Seed only users (requires existing roles)
npm run seed:users

# Clear all data without seeding
npm run seed:clear-all
```

## 👥 User Roles & Permissions

### **Admin** (`admin`)
- **Full system access** with all permissions
- **Permissions**: All CRUD operations on all resources
- **Users**: `admin@mayhemcreation.com`, `shawn.denis@mayhemcreation.com`

### **Manager** (`manager`)
- **Store management** with product and order oversight
- **Permissions**: Product management, inventory, orders, customers, analytics
- **Users**: `manager@mayhemcreation.com`, `operations@mayhemcreation.com`

### **Designer** (`designer`)
- **Creative design** with product and embroidery focus
- **Permissions**: Product design, embroidery management, content creation
- **Users**: `designer@mayhemcreation.com`, `creative@mayhemcreation.com`

### **Support** (`support`)
- **Customer support** with limited admin access
- **Permissions**: Customer management, orders, support tickets, messages
- **Users**: `support@mayhemcreation.com`, `help@mayhemcreation.com`

### **Moderator** (`moderator`)
- **Content moderation** and community management
- **Permissions**: Reviews, content, FAQ, support, messages
- **Users**: `moderator@mayhemcreation.com`

### **Customer** (`customer`)
- **Standard customer** with basic shopping permissions
- **Permissions**: Products, orders, profile, reviews, cart, customization
- **Users**: `customer1@example.com` through `customer5@example.com`

## 🔐 Default Credentials

All seeded users use secure passwords following the pattern: `Secure{Role}2024!` or `SecureCustomer2024!`

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mayhemcreation.com` | `SecureAdmin2024!` |
| Admin | `shawn.denis@mayhemcreation.com` | `SecureShawn2024!` |
| Manager | `manager@mayhemcreation.com` | `SecureManager2024!` |
| Manager | `operations@mayhemcreation.com` | `SecureCustomer2024!` |
| Designer | `designer@mayhemcreation.com` | `SecureCustomer2024!` |
| Designer | `creative@mayhemcreation.com` | `SecureCustomer2024!` |
| Support | `support@mayhemcreation.com` | `SecureCustomer2024!` |
| Support | `help@mayhemcreation.com` | `SecureCustomer2024!` |
| Moderator | `moderator@mayhemcreation.com` | `SecureCustomer2024!` |
| Customer | `customer1@example.com` | `SecureCustomer2024!` |
| Customer | `customer2@example.com` | `SecureCustomer2024!` |
| Customer | `customer3@example.com` | `SecureCustomer2024!` |
| Customer | `customer4@example.com` | `SecureCustomer2024!` |
| Customer | `customer5@example.com` | `SecureCustomer2024!` |

## 📊 Seeded Data Summary

### **Roles**: 6 roles
- `admin` - Full system access
- `customer` - Standard customer access
- `support` - Customer support access
- `manager` - Store management access
- `designer` - Creative design access
- `moderator` - Content moderation access

### **Users**: 14 users
- **2 Admin users** (including Shawn Denis)
- **2 Manager users** (operations and store management)
- **2 Designer users** (creative team)
- **2 Support users** (customer service)
- **1 Moderator user** (content moderation)
- **5 Customer users** (various verification states)

### **User States**:
- **Email Verified**: 13 users
- **Phone Verified**: 12 users
- **Active**: 13 users (1 inactive for testing)
- **System Users**: 9 users (@mayhemcreation.com)
- **Customer Users**: 5 users (@example.com)

### **Categories**: 17 categories
- **3 main categories**: Apparel, Accessories, Patches
- **14 subcategories** with proper parent relationships
- **Hierarchical structure** with sort ordering

### **Products**: 12 products
- **Complete product catalog** with realistic data
- **Proper category associations** and relationships
- **Featured products** with badges and ratings
- **Inventory tracking** with stock management

### **Variants**: 62 variants
- **Product variants** with color, size, and SKU
- **Inventory management** with stock levels
- **Pricing structure** with variant-specific pricing
- **Active/inactive states** for variant management

### **Embroidery Options**: 25 options
- **Service categories**: coverage, threads, material, border, backing, upgrades, cutting
- **Pricing tiers** with different complexity levels
- **Active/inactive states** for service management
- **Compatibility tracking** for service combinations

## 📁 Categories Data

### **Categories Structure**:
- **17 categories total** with hierarchical organization
- **3 main categories**: Apparel, Accessories, Patches
- **14 subcategories** with proper parent relationships

### **Category Breakdown**:
- **Apparel** (6 subcategories):
  - T-Shirts, Hoodies, Polo Shirts, Long Sleeve Tees, Zip Hoodies, Vintage Tees
- **Accessories** (5 subcategories):
  - Caps, Trucker Caps, Tote Bags, Crossbody Bags, Drawstring Bags
- **Patches** (3 subcategories):
  - Iron-On Patches, Sew-On Patches, Patch Packs

## 🛠️ Seeder Commands

### 🔐 Authentication-Based Commands (Recommended)
| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run seed:comprehensive:clear -- --use-api` | Full seeding with auth | Production-like seeding |
| `npm run seed:categories -- --use-api` | Categories with auth | Category management |
| `npm run seed:products -- --use-api` | Products with auth | Product management |
| `npm run seed:variants -- --use-api` | Variants with auth | Variant management |
| `npm run seed:embroidery -- --use-api` | Embroidery with auth | Service management |

### 📊 Comprehensive Commands
| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run seed:comprehensive:clear` | Full seeding (direct) | Complete data setup |
| `npm run seed:force` | Force recreate tables | Schema changes |
| `npm run seed:clear` | Clear and reseed | Fresh data |
| `npm run seed:reset` | Full database reset | Complete reset |

### 🔧 Traditional Commands (Direct Model Access)
| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run seed` | Basic seeding | Development setup |
| `npm run seed:roles` | Roles only | Role management |
| `npm run seed:users` | Users only | User management |
| `npm run seed:categories` | Categories only | Category management |
| `npm run seed:products` | Products only | Product management |
| `npm run seed:variants` | Variants only | Variant management |
| `npm run seed:embroidery` | Embroidery only | Service management |
| `npm run seed:clear-all` | Clear all data | Clean slate |

## 🔐 Authentication-Based Seeding System

### **How It Works**
The authentication-based seeding system ensures that all data is created through proper API endpoints with full authentication and validation:

1. **Admin Authentication**: Creates/finds admin user with proper permissions
2. **Session Management**: Creates authenticated session for seeding operations
3. **API Compliance**: All data goes through protected API endpoints
4. **Business Logic**: All validation rules and business logic are applied
5. **Session Cleanup**: Properly cleans up admin session after completion

### **Benefits**
- ✅ **Production-like behavior**: Data is created exactly as it would be in production
- ✅ **Validation compliance**: All business rules and validations are enforced
- ✅ **Audit trail**: All seeded data is properly attributed to admin user
- ✅ **Security compliance**: Respects authentication and authorization system
- ✅ **Error handling**: Proper error handling and rollback on failures

### **Authentication Flow**
```
1. Create/Find Admin User → 2. Create Admin Session → 3. Validate Permissions
                                                           ↓
6. Cleanup Session ← 5. Complete Seeding ← 4. Seed Data via API
```

## 🔧 Customization

### Adding New Roles
1. Edit `src/seeders/roleSeeder.ts`
2. Add role data to `roleData` array
3. Run `npm run seed:roles`

### Adding New Users
1. Edit `src/seeders/userSeeder.ts`
2. Add user data to `userData` array
3. Run `npm run seed:users`

### Adding New Categories
1. Edit `src/seeders/categorySeeder.ts`
2. Add category data to `categorySeedData` array
3. Run `npm run seed:categories -- --use-api`

### Adding New Products
1. Edit `src/seeders/productSeeder.ts`
2. Add product data to `productSeedData` array
3. Run `npm run seed:products -- --use-api`

### Adding New Variants
1. Edit `src/seeders/variantSeeder.ts`
2. Add variant data to `variantSeedData` array
3. Run `npm run seed:variants -- --use-api`

### Adding New Embroidery Options
1. Edit `src/seeders/embroideryOptionSeeder.ts`
2. Add embroidery data to `embroiderySeedData` array
3. Run `npm run seed:embroidery -- --use-api`

### Modifying Permissions
1. Edit `src/seeders/roleSeeder.ts`
2. Update `permissions` array for desired role
3. Run `npm run seed:roles`

## 🧪 Testing with Seeded Data

### Login Test Users
```bash
# Test admin login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mayhemcreation.com", "password": "SecureAdmin2024!"}'

# Test customer login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@example.com", "password": "SecureCustomer2024!"}'
```

### Role-Based Access Testing
- **Admin**: Can access all endpoints (including protected write operations)
- **Manager**: Can manage products, orders, inventory
- **Designer**: Can manage products, embroidery, content
- **Support**: Can manage customers, orders, support
- **Moderator**: Can manage reviews, content, FAQ
- **Customer**: Can access products, orders, profile (read-only for most operations)

### Testing Protected Endpoints
```bash
# Test protected product creation (requires admin/seller role)
curl -X POST http://localhost:5001/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"title": "Test Product", "price": 29.99}'

# Test protected category creation (requires admin role)
curl -X POST http://localhost:5001/api/v1/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name": "Test Category", "description": "Test"}'
```

### Testing Seeded Data
```bash
# View all products
curl -X GET http://localhost:5001/api/v1/products

# View all categories
curl -X GET http://localhost:5001/api/v1/categories

# View all variants
curl -X GET http://localhost:5001/api/v1/variants

# View all embroidery options
curl -X GET http://localhost:5001/api/v1/embroidery-options
```

## 🚨 Important Notes

### **Security Warning**
- Default passwords are for **development only**
- Change all passwords in production
- Use strong, unique passwords for production
- Admin user created by seeders has full system access

### **Authentication-Based Seeding**
- **Recommended approach**: Use `--use-api` flag for production-like seeding
- **Admin session**: Seeding creates temporary admin session for operations
- **Session cleanup**: Admin session is automatically cleaned up after seeding
- **Validation compliance**: All business rules and validations are enforced

### **Data Persistence**
- Seeded data persists between server restarts
- Use `npm run seed:clear` to remove test data
- Use `npm run seed:reset` for complete database reset
- Admin user created by seeders persists for future seeding operations

### **Dependencies**
- Roles must be seeded before users
- Users reference roles by name
- Seeding will fail if roles don't exist
- Authentication-based seeding requires admin user to exist
- Categories should be seeded before products
- Products should be seeded before variants

## 🐛 Troubleshooting

### **"Role not found" Error**
```bash
# Seed roles first
npm run seed:roles

# Then seed users
npm run seed:users
```

### **"User already exists" Error**
```bash
# Clear existing users
npm run seed:clear

# Or clear all data
npm run seed:reset
```

### **"Authentication failed" Error (API-based seeding)**
```bash
# Ensure admin user exists
npm run seed:roles
npm run seed:users

# Then try API-based seeding
npm run seed:comprehensive:clear -- --use-api
```

### **"Permission denied" Error**
```bash
# Check if admin user has proper permissions
npm run seed:roles

# Verify admin role has all permissions
# Check roleSeeder.ts for admin permissions
```

### **"Session creation failed" Error**
```bash
# Check database connection
npm run seed:roles

# Verify session table exists
# Check database schema
```

### **Database Connection Error**
- Ensure MariaDB is running
- Check `.env` database credentials
- Verify database exists
- Check if all required tables exist

### **API Endpoint Errors**
- Ensure backend server is running on port 5001
- Check if routes are properly configured
- Verify middleware is correctly applied
- Check server logs for detailed error messages

## 📈 Next Steps

After seeding, you can:
1. **Test Authentication**: Use the seeded users to test login/logout
2. **Test Authorization**: Verify role-based access control with protected endpoints
3. **Test API Endpoints**: Use seeded data to test all CRUD operations
4. **Develop Features**: Use realistic data for development and testing
5. **Run Integration Tests**: Use seeded data for comprehensive testing
6. **Demo the App**: Show real functionality with complete sample data
7. **Test Business Logic**: Verify all validation rules work with seeded data
8. **Performance Testing**: Use seeded data for load and performance testing

### **Recommended Workflow**
1. **Start with authentication-based seeding**: `npm run seed:comprehensive:clear -- --use-api`
2. **Test all endpoints** with the seeded data
3. **Verify business logic** works correctly
4. **Develop new features** using the realistic data
5. **Run comprehensive tests** with the seeded data

Happy Seeding! 🌱
