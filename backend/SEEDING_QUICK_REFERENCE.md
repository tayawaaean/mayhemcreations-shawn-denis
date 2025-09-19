# 🌱 Seeding Quick Reference Guide

## 🚀 Most Common Commands

### **Complete Setup (Recommended)**
```bash
# Full database setup with authentication
npm run seed:comprehensive:clear -- --use-api
```

### **Individual Components**
```bash
# Categories only
npm run seed:categories -- --use-api

# Products only (requires categories)
npm run seed:products -- --use-api

# Variants only (requires products)
npm run seed:variants -- --use-api

# Embroidery options only
npm run seed:embroidery -- --use-api
```

## 🔐 Authentication-Based vs Direct Seeding

| Approach | Command | Use Case | Benefits |
|----------|---------|----------|----------|
| **Authentication** | `--use-api` | Production-like | Full validation, business logic |
| **Direct** | No flag | Development | Faster, bypasses validation |

## 📊 What Gets Seeded

### **Roles (6)**
- `admin` - Full system access
- `customer` - Standard customer
- `support` - Customer support
- `manager` - Store management
- `designer` - Creative design
- `moderator` - Content moderation

### **Users (14)**
- **2 Admin users** (including Shawn Denis)
- **2 Manager users** (operations)
- **2 Designer users** (creative team)
- **2 Support users** (customer service)
- **1 Moderator user** (content moderation)
- **5 Customer users** (test accounts)

### **Categories (17)**
- **3 main categories**: Apparel, Accessories, Patches
- **14 subcategories** with proper hierarchy

### **Products (12)**
- Complete product catalog with realistic data
- Proper category associations
- Featured products with ratings

### **Variants (62)**
- Product variants with color, size, SKU
- Inventory management with stock levels
- Pricing structure

### **Embroidery Options (25)**
- Service categories and pricing tiers
- Active/inactive states
- Compatibility tracking

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mayhemcreation.com` | `SecureAdmin2024!` |
| Customer | `customer1@example.com` | `SecureCustomer2024!` |

## 🧪 Quick Testing

### **Test Login**
```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mayhemcreation.com", "password": "SecureAdmin2024!"}'
```

### **Test Protected Endpoint**
```bash
curl -X GET http://localhost:5001/api/v1/products
```

### **Test Seeded Data**
```bash
# View all data
curl -X GET http://localhost:5001/api/v1/categories
curl -X GET http://localhost:5001/api/v1/products
curl -X GET http://localhost:5001/api/v1/variants
curl -X GET http://localhost:5001/api/v1/embroidery-options
```

## 🚨 Common Issues

### **"Authentication failed"**
```bash
# Ensure admin user exists
npm run seed:roles
npm run seed:users
```

### **"Permission denied"**
```bash
# Check admin permissions
npm run seed:roles
```

### **"Database connection error"**
- Check MariaDB is running
- Verify `.env` credentials
- Ensure database exists

## 📈 Workflow

1. **Start fresh**: `npm run seed:comprehensive:clear -- --use-api`
2. **Test endpoints**: Use curl commands above
3. **Develop features**: Use realistic seeded data
4. **Run tests**: Comprehensive testing with seeded data

## 🔄 Reset Options

```bash
# Clear all data
npm run seed:clear-all

# Reset entire database
npm run seed:reset

# Clear specific data
npm run seed:clear
```

---

**💡 Tip**: Always use `--use-api` for production-like behavior and full validation compliance!
