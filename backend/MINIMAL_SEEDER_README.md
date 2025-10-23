# Minimal Seeder

## Overview

The minimal seeder is designed to set up a clean database with only the essential data needed for the system to function. This is ideal for:

- Setting up a fresh production environment
- Testing core functionality without sample data clutter
- Starting development with a clean slate
- Preparing the system for manual data entry (you'll add categories and products manually)

## What Gets Seeded

The minimal seeder creates only the following data:

### 1. Admin Account (1 User Only)
- **Email:** `admin@mayhemcreations.com`
- **Password:** `admin123!`
- **Role:** Administrator
- **Name:** System Administrator
- **Status:** Active and verified

### 2. Embroidery Options
- All standard embroidery options organized by category:
  - Coverage options (50%, 75%, 100%)
  - Material options (Polyester Blend Twill, Felt, Ballistic Nylon, Camouflage, Reflective)
  - Border options (No Border, Embroidered Border, Merrowed Border)
  - Thread options (Standard Polyester, Metallic, Glow-in-the-Dark)
  - Backing options (Standard, Iron-On)
  - Upgrades (Rush Processing, Extra Durable Stitching)
  - Cutting options (Standard Cut, Die Cut to Shape)

### 3. FAQs
- Common questions organized by category:
  - General questions about the service
  - Ordering process and customization
  - Shipping and delivery information
  - Returns, refunds, and exchanges
  - Product care and quality
  - Account and payment information

### 4. Material Costs
- Fabric: $34.00 (30" × 36", 1.5x waste factor)
- Patch Attach: $100.00 (9" × 360", 1.5x waste factor)
- Thread: $4.00 (5000" length, 1.2x waste factor)
- Bobbin: $50.00 (35000" length, 1.2x waste factor)
- Cut-Away Stabilizer: $180.00 (18" × 3600", 1.5x waste factor)
- Wash-Away Stabilizer: $60.00 (15" × 900", 1.5x waste factor)

## What Does NOT Get Seeded

The minimal seeder explicitly DOES NOT create:

- Additional users (only 1 admin account)
- Categories (you'll create these manually based on your needs)
- Sample products
- Sample variants
- Sample orders
- Sample reviews
- Sample messages

## Usage

### Using NPM Script (Recommended)

```bash
npm run seed:minimal
```

### Using Node Directly

```bash
node --env-file=.env -r ts-node/register src/seeders/minimalSeeder.ts
```

## What Happens During Seeding

1. **Database Sync:** Ensures database tables are properly structured
2. **Data Cleanup:** 
   - Clears existing variants and products
   - Clears material costs and FAQs
   - **Clears all non-admin users** (customers, sellers, staff)
   - **Clears all non-admin roles** (customer, seller, staff)
3. **Admin Creation:** Creates or updates admin role and admin user
4. **Embroidery Seeding:** Seeds all embroidery options (clears existing first)
5. **FAQ Seeding:** Seeds frequently asked questions
6. **Material Cost Seeding:** Seeds material costing data
7. **Message Cleanup:** Clears any existing chat messages
8. **Summary Display:** Shows what was created

## Database State After Seeding

After running the minimal seeder, your database will contain:

- 1 Role (admin)
- 1 User (admin@mayhemcreations.com)
- ~30 Embroidery Options (across all categories)
- ~20+ FAQs (organized by category)
- 6 Material Costs
- 0 Categories (you'll create these manually)
- 0 Products
- 0 Regular Users

## Admin Account Details

The admin account credentials created are:

```
Email: admin@mayhemcreations.com
Password: admin123!
```

**IMPORTANT:** Change this password immediately in production environments.

## Use Cases

### Production Setup
```bash
# Set up production with minimal data
npm run seed:minimal
```

### Development Reset
```bash
# Reset to clean state for development
npm run seed:minimal
```

### Testing Core Features
```bash
# Test admin functions without sample data noise
npm run seed:minimal
```

## Comparison with Other Seeders

| Seeder | Admin | Users | Products | Embroidery | FAQs | Materials | Categories |
|--------|-------|-------|----------|------------|------|-----------|------------|
| **Minimal** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Comprehensive | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Products Only | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

## After Seeding

After running the minimal seeder, you can:

1. **Login to Admin Panel**
   - Use the admin credentials provided
   - Access all admin features
   - Manually create categories, products, users, etc.

2. **Create Categories First**
   - Set up your product categories and subcategories
   - Define which categories have sizing (apparel vs accessories)
   - Configure category slugs and display order

3. **Add Products**
   - Once categories are created, you can add products
   - Embroidery options are already available for product customization
   - Material costs are configured for pricing calculations

4. **Create Additional Users**
   - Create customer accounts as needed
   - Create additional admin/staff accounts
   - Assign appropriate roles

## Troubleshooting

### Foreign Key Constraint Errors

If you encounter foreign key constraint errors, the seeder handles deletion in the correct order:
1. Variants (first)
2. Products (second)
3. Material Costs and FAQs (third)

### Admin Already Exists

If the admin user already exists, the seeder will:
- Keep the existing admin user
- Update the role assignment if needed
- Log that the admin already exists

### Database Connection Issues

Ensure your `.env` file is properly configured with:
```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=3306
```

## Related Files

- **Seeder:** `backend/src/seeders/minimalSeeder.ts`
- **Script:** `backend/package.json` (seed:minimal)
- **Dependencies:**
  - `embroideryOptionSeeder.ts`
  - `faqSeeder.ts`
  - `materialCostSeeder.ts`
  - `productSeeder.ts` (for clearing products)
  - `variantSeeder.ts` (for clearing variants)

## Notes

- The seeder is idempotent - running it multiple times is safe
- Existing admin credentials will not be overwritten
- **⚠️ WARNING: All customer, seller, and staff accounts will be DELETED**
- All data is cleared before seeding (except the admin account)
- Material costs reflect real-world pricing for the embroidery business
- Embroidery options include both basic and premium options
- FAQs cover common customer questions and concerns
- Categories are NOT seeded - you'll create these manually based on your specific needs

## Support

For issues or questions:
1. Check the console output for detailed error messages
2. Verify database connection and permissions
3. Ensure all dependencies are installed
4. Check that models are properly synchronized

