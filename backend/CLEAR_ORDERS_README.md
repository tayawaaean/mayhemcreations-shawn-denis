# Order Clearing Scripts

This directory contains scripts and seeders for clearing order-related data from the database.

## Available Scripts

### 1. Standalone Order Clearing Script

**File:** `clear-orders-standalone.js`

A standalone script that can be run independently without requiring the full application setup.

#### Usage:

```bash
# Clear all orders completely
npm run clear-orders

# Reset orders to pending state (keeps cart items, just resets status)
npm run reset-orders

# Or run directly
node clear-orders-standalone.js
node clear-orders-standalone.js --reset-pending
node clear-orders-standalone.js --help
```

#### What it clears:

- **Complete Clear (`clear-orders`):**
  - All order reviews
  - All custom embroidery orders
  - All cart items

- **Reset to Pending (`reset-orders`):**
  - All order reviews
  - All custom embroidery orders
  - Resets submitted cart items back to pending status

### 2. Seeder-based Order Clearing

**File:** `src/seeders/clearOrdersSeeder.ts`

Integrated with the main seeder system.

#### Usage:

```bash
# Clear all orders
npm run seed -- --clear-orders

# Reset orders to pending
npm run seed -- --reset-orders
```

### 3. SQL Script

**File:** `clear-pending-orders.sql`

Direct SQL script that can be run in any MySQL client.

```sql
-- Clear all order reviews
DELETE FROM order_reviews;

-- Reset cart items that are marked as submitted back to pending
UPDATE carts 
SET review_status = 'pending', 
    order_review_id = NULL 
WHERE review_status = 'submitted';
```

## Environment Variables

The scripts use the following environment variables (from `.env` file):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mayhem_creations
```

## What Gets Cleared

### Order Reviews Table
- All submitted orders for review
- Admin picture replies
- Customer confirmations
- Review status and timestamps

### Custom Embroidery Orders Table
- All custom embroidery order data
- Design files and previews
- Customization details

### Carts Table
- **Complete Clear:** All cart items
- **Reset to Pending:** Only resets submitted items back to pending status

## Safety Features

- **Connection Management:** Properly opens and closes database connections
- **Error Handling:** Comprehensive error handling with detailed messages
- **Summary Display:** Shows counts before and after clearing
- **Dry Run Support:** Can be modified to show what would be cleared without actually clearing

## Use Cases

1. **Development Testing:** Clear test orders between development sessions
2. **Demo Preparation:** Start with a clean slate for demonstrations
3. **Data Reset:** Reset the system to initial state
4. **Troubleshooting:** Clear problematic order data

## Examples

### Clear all orders for fresh start:
```bash
npm run clear-orders
```

### Reset orders but keep cart items:
```bash
npm run reset-orders
```

### Check what would be cleared (modify script for dry run):
```bash
node clear-orders-standalone.js --help
```

## Notes

- Always backup your database before running these scripts in production
- The scripts are designed to be safe and only affect order-related data
- User accounts, products, categories, and other core data are not affected
- The standalone script uses direct MySQL connection and doesn't require the full application to be running
