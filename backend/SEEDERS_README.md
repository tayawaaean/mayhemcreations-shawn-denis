# 🌱 Database Seeders - Mayhem Creations Backend

This directory contains database seeders for populating the application with initial data for development and testing.

## 📁 Structure

```
src/seeders/
├── index.ts          # Main seeder runner and CLI
├── roleSeeder.ts     # Role and permission seeding
├── userSeeder.ts     # User account seeding
└── SEEDERS_README.md # This documentation
```

## 🚀 Quick Start

### Basic Seeding
```bash
# Seed all data (roles + users)
npm run seed

# Force recreate tables and seed
npm run seed:force

# Clear existing data and reseed
npm run seed:clear
```

### Advanced Seeding
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

### **Users**: 15 users
- **2 Admin users** (including Shawn Denis)
- **2 Manager users** (operations and store management)
- **2 Designer users** (creative team)
- **2 Support users** (customer service)
- **1 Moderator user** (content moderation)
- **5 Customer users** (various verification states)

### **User States**:
- **Email Verified**: 13 users
- **Phone Verified**: 12 users
- **Active**: 14 users (1 inactive for testing)
- **System Users**: 9 users (@mayhemcreation.com)
- **Customer Users**: 5 users (@example.com)

## 🛠️ Seeder Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run seed` | Basic seeding | Development setup |
| `npm run seed:force` | Force recreate tables | Schema changes |
| `npm run seed:clear` | Clear and reseed | Fresh data |
| `npm run seed:reset` | Full database reset | Complete reset |
| `npm run seed:roles` | Roles only | Role management |
| `npm run seed:users` | Users only | User management |
| `npm run seed:clear-all` | Clear all data | Clean slate |

## 🔧 Customization

### Adding New Roles
1. Edit `src/seeders/roleSeeder.ts`
2. Add role data to `roleData` array
3. Run `npm run seed:roles`

### Adding New Users
1. Edit `src/seeders/userSeeder.ts`
2. Add user data to `userData` array
3. Run `npm run seed:users`

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
  -d '{"email": "admin@mayhemcreation.com", "password": "AdminPass123!"}'

# Test customer login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@example.com", "password": "CustomerPass123!"}'
```

### Role-Based Access Testing
- **Admin**: Can access all endpoints
- **Manager**: Can manage products, orders, inventory
- **Designer**: Can manage products, embroidery, content
- **Support**: Can manage customers, orders, support
- **Moderator**: Can manage reviews, content, FAQ
- **Customer**: Can access products, orders, profile

## 🚨 Important Notes

### **Security Warning**
- Default passwords are for **development only**
- Change all passwords in production
- Use strong, unique passwords for production

### **Data Persistence**
- Seeded data persists between server restarts
- Use `npm run seed:clear` to remove test data
- Use `npm run seed:reset` for complete database reset

### **Dependencies**
- Roles must be seeded before users
- Users reference roles by name
- Seeding will fail if roles don't exist

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

### **Database Connection Error**
- Ensure MariaDB is running
- Check `.env` database credentials
- Verify database exists

## 📈 Next Steps

After seeding, you can:
1. **Test Authentication**: Use the seeded users to test login/logout
2. **Test Authorization**: Verify role-based access control
3. **Develop Features**: Use realistic data for development
4. **Run Tests**: Use seeded data for integration tests
5. **Demo the App**: Show real functionality with sample data

Happy Seeding! 🌱
