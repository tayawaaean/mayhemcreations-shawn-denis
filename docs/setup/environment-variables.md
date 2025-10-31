# Environment Variables Documentation

This document explains all environment variables used in the Mayhem Creations application and which parts of the system use them.

## 📁 Environment Files

- **`.env.development`** - Local development configuration
- **`.env.production`** - Production deployment configuration

## 🔧 Variable Categories

### 1. Authentication & Security
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth, AuthContext, Login components | Google OAuth authentication |
| `VITE_REACT_APP_GOOGLE_OAUTH_SCRIPT_URL` | Google OAuth integration | Google OAuth script loading |

### 2. API Configuration
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_API_URL` | API service, all backend communication | Backend API endpoint |

### 3. Payment Configuration
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe components, payment forms | Stripe publishable key for frontend |
| `VITE_PAYPAL_CLIENT_ID` | PayPal components, payment forms | PayPal client ID for frontend |
| `VITE_PAYPAL_ENVIRONMENT` | PayPal components | PayPal environment (sandbox/production) |

### 4. Application Configuration
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_APP_NAME` | App title, branding, headers | Application name display |
| `VITE_REACT_APP_APP_DOMAIN` | Domain validation, CORS | Application domain |
| `VITE_REACT_APP_APP_ENV` | Environment detection, feature flags | Environment mode (development/production) |

### 5. Contact Information
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_CONTACT_EMAIL` | Contact page, footer, email forms | General contact email |
| `VITE_REACT_APP_ORDERS_EMAIL` | Order processing, customer support | Order-related communications |
| `VITE_REACT_APP_PHONE_1` | Contact page, footer | Primary phone number |
| `VITE_REACT_APP_PHONE_2` | Contact page, footer | Secondary phone number |

### 6. Business Information
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_BUSINESS_ADDRESS_1` | About page, contact page, footer | Business address line 1 |
| `VITE_REACT_APP_BUSINESS_ADDRESS_2` | About page, contact page, footer | Business address line 2 |
| `VITE_REACT_APP_BUSINESS_HOURS_WEEKDAY` | Contact page, footer | Weekday business hours |
| `VITE_REACT_APP_BUSINESS_HOURS_SATURDAY` | Contact page, footer | Saturday business hours |
| `VITE_REACT_APP_BUSINESS_HOURS_SUNDAY` | Contact page, footer | Sunday business hours |

### 7. Demo Accounts (Development Only)
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_DEMO_ADMIN_EMAIL` | Login forms, admin panel | Admin demo account |
| `VITE_REACT_APP_DEMO_SHAWN_EMAIL` | Login forms, testing | Shawn's demo account |
| `VITE_REACT_APP_DEMO_MANAGER_EMAIL` | Login forms, testing | Manager demo account |
| `VITE_REACT_APP_DEMO_DESIGNER_EMAIL` | Login forms, testing | Designer demo account |
| `VITE_REACT_APP_DEMO_CUSTOMER_EMAIL` | Login forms, testing | Customer demo account |
| `VITE_REACT_APP_DEMO_JANE_EMAIL` | Login forms, testing | Jane's demo account |
| `VITE_REACT_APP_DEMO_MIKE_EMAIL` | Login forms, testing | Mike's demo account |

### 7. External Services
| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_REACT_APP_UI_AVATARS_BASE_URL` | Avatar generation, user profiles | UI Avatars service URL |
| `VITE_REACT_APP_PLACEHOLDER_IMAGE_URL` | Image handling, product cards | Placeholder image service |
| `VITE_REACT_APP_UNSPLASH_BASE_URL` | Image handling, galleries | Unsplash image service |

## 🏗️ System Components Using Environment Variables

### Frontend Components
- **AuthContext** - Authentication state management
- **Login Components** - User authentication
- **API Service** - Backend communication
- **Contact Page** - Business information display
- **Footer** - Contact information
- **Admin Panel** - Demo account access

### Services
- **envConfig.ts** - Centralized environment variable access
- **API Service** - Backend endpoint configuration
- **Google OAuth** - Authentication integration

## 🔒 Security Notes

### Development Environment
- ✅ Demo accounts available for testing
- ✅ Localhost URLs for local development
- ✅ Development Google OAuth client ID

### Production Environment
- ❌ No demo accounts (security)
- ✅ Production URLs and domains
- ⚠️ Must replace placeholder Google OAuth client ID

## 🚀 Usage Examples

### Accessing Environment Variables
```typescript
import { envConfig } from './shared/envConfig'

// Get API URL
const apiUrl = envConfig.getApiBaseUrl()

// Check if demo accounts are available
if (envConfig.hasDemoAccounts()) {
  const demoAccounts = envConfig.getDemoAccounts()
}

// Get business information
const businessHours = envConfig.getBusinessHours()
```

### Environment Detection
```typescript
// Check environment
if (envConfig.isDevelopment()) {
  // Development-specific code
}

if (envConfig.isProduction()) {
  // Production-specific code
}
```

## 📝 Setup Instructions

### Development Setup
1. Copy `.env.development` to your local environment
2. All variables are pre-configured for local development
3. Demo accounts are available for testing

### Production Setup
1. Copy `.env.production` to your production environment
2. Replace `your_production_google_client_id_here` with actual Google OAuth client ID
3. Update URLs to match your production domain
4. Demo accounts are automatically disabled

## ⚠️ Important Notes

- All environment variables must use `VITE_REACT_APP_` prefix
- Never commit sensitive production values to version control
- Demo accounts are only available in development mode
- Environment variables are loaded at build time, not runtime
