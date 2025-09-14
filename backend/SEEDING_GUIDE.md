# Database Seeding Guide

This guide explains how to populate the Mayhem Creations database with sample data for development and testing.

## Quick Start

To populate the database with all data (roles, users, categories, products, and variants):

```bash
cd backend
npm run seed
```

## Available Seed Commands

### Main Seeding Commands

| Command | Description | What it seeds |
|---------|-------------|---------------|
| `npm run seed` | Seeds all data (default) | Roles, Users, Categories, Products, Variants |
| `npm run seed:force` | Force recreate tables and seed | All data with fresh tables |
| `npm run seed:clear` | Clear existing data and reseed | All data (clears first) |
| `npm run seed:reset` | Complete database reset and seed | All data (drops and recreates) |

### Specific Data Seeding

| Command | Description | What it seeds |
|---------|-------------|---------------|
| `npm run seed:roles` | Seed only roles | Admin, User, Seller roles |
| `npm run seed:users` | Seed only users | Test admin and user accounts |
| `npm run seed:variants` | Seed only variants | Product variants with sizes/colors |
| `npm run seed:products-only` | Seed only products | Products without variants |

### Cleanup Commands

| Command | Description | What it clears |
|---------|-------------|----------------|
| `npm run seed:clear-all` | Clear all data | Everything (keeps tables) |

## What Gets Seeded

### 1. Roles (3 roles)
- **Admin**: Full system access
- **User**: Customer access
- **Seller**: Vendor access

### 2. Users (2 test accounts)
- **Admin Account**: `admin@mayhemcreations.com` / `admin123`
- **Test User**: `user@example.com` / `user123`

### 3. Categories (3 main categories with subcategories)
- **Apparel**
  - T-Shirts
  - Polo Shirts
  - Hoodies
  - Long Sleeve Tees
- **Accessories**
  - Caps
  - Trucker Caps
- **Embroidery**
  - Custom Designs
  - Patches

### 4. Products (10+ products)
- **Apparel Products**: T-shirts, hoodies, polo shirts with `hasSizing: true`
- **Accessory Products**: Caps and bags with `hasSizing: false`
- **Pricing**: $19-$45 range
- **Images**: High-quality product photos
- **Descriptions**: Detailed product information

### 5. Variants (10 variants with realistic stock)
- **Embroidered Classic Tee**: 5 variants (White S/M, Black S/M, Navy L)
- **Classic Hoodie**: 3 variants (Gray M/L, Black XL)
- **Embroidered Cap**: 2 variants (Black/White One Size)

#### Stock Levels
- **In Stock**: 15-50 units
- **Low Stock**: 5-10 units (triggers warnings)
- **Out of Stock**: 0 units (shows as unavailable)

#### SKU Format
- `TEE-001-WH-S` (Product-Code-Color-Size)
- `HOD-001-GR-M` (Hoodie-Gray-Medium)
- `CAP-001-BK-OS` (Cap-Black-OneSize)

## Development Workflow

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp env.example .env
# Edit .env with your database credentials

# 3. Seed the database
npm run seed
```

### Adding New Test Data
```bash
# Add only variants for testing
npm run seed:variants

# Add only products
npm run seed:products-only

# Reset everything and start fresh
npm run seed:reset
```

### Testing Different Scenarios
```bash
# Test with empty database
npm run seed:clear-all
npm run seed

# Test with only products (no variants)
npm run seed:clear-all
npm run seed:products-only

# Test with only variants (requires existing products)
npm run seed:variants
```

## Database Schema Updates

The seeder automatically handles:
- ✅ Table creation and synchronization
- ✅ Foreign key relationships
- ✅ Index creation
- ✅ Data validation
- ✅ Error handling and rollback

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check your .env file
   cat .env
   # Ensure DATABASE_URL is correct
   ```

2. **Foreign Key Constraint Errors**
   ```bash
   # Clear all data and reseed
   npm run seed:clear-all
   npm run seed
   ```

3. **Table Already Exists**
   ```bash
   # Force recreate tables
   npm run seed:force
   ```

4. **Variant Seeding Fails**
   ```bash
   # Ensure products exist first
   npm run seed:products-only
   npm run seed:variants
   ```

### Reset Everything
```bash
# Nuclear option - complete reset
npm run seed:reset
```

## Sample Data Overview

After running `npm run seed`, you'll have:

- **3 Roles** with proper permissions
- **2 Users** for testing authentication
- **3 Main Categories** with 8 subcategories
- **10+ Products** with realistic pricing and descriptions
- **10 Variants** with different sizes, colors, and stock levels

This provides a complete testing environment for:
- ✅ User authentication and authorization
- ✅ Product browsing and filtering
- ✅ Inventory management
- ✅ Shopping cart functionality
- ✅ Order processing
- ✅ Admin panel operations

## Next Steps

After seeding:
1. Start the backend: `npm run dev`
2. Start the frontend: `cd ../frontend && npm run dev`
3. Visit the admin panel: `http://localhost:3000/admin`
4. Login with: `admin@mayhemcreations.com` / `admin123`
5. Explore the inventory and product management features
