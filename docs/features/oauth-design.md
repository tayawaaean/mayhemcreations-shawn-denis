# 🔐 OAuth Integration Design - Unified User System

## 🎯 **Core Concept: Email-Based Account Linking**

The OAuth system is designed around **email as the primary identifier** for account linking. This ensures:

- ✅ **Same email = Same user account** regardless of login method
- ✅ **Cart, orders, and preferences persist** across login methods  
- ✅ **Users can link multiple OAuth providers** to one account
- ✅ **No duplicate accounts** for the same person
- ✅ **Seamless user experience** with unified data

## 🏗️ **Database Schema Design**

### **Updated User Model**
```typescript
interface UserAttributes {
  // ... existing fields
  password?: string; // Made optional for OAuth-only accounts
  avatar?: string; // Added for OAuth avatar support
  loginMethod: 'password' | 'oauth' | 'both'; // Track how user can login
}
```

### **New OAuth Provider Model**
```typescript
interface OAuthProviderAttributes {
  id: number;
  userId: number; // Links to users table
  provider: string; // 'google', 'facebook', 'apple', etc.
  providerId: string; // The ID from the OAuth provider
  email: string; // Email from OAuth provider (for verification)
  firstName?: string;
  lastName?: string;
  avatar?: string;
  accessToken?: string; // Encrypted OAuth access token
  refreshToken?: string; // Encrypted OAuth refresh token
  tokenExpiresAt?: Date;
  isActive: boolean;
  lastUsedAt?: Date;
}
```

## 🔄 **OAuth Flow Logic**

### **1. New User (OAuth Only)**
```
Google Login → Verify Token → Check Email → Create User + OAuth Provider → Create Session
```

### **2. Existing User (Password Only)**
```
Google Login → Verify Token → Find by Email → Link OAuth Provider → Update loginMethod to 'both' → Create Session
```

### **3. Existing User (OAuth Only)**
```
Google Login → Verify Token → Find OAuth Provider → Update lastUsedAt → Create Session
```

### **4. Existing User (Both Methods)**
```
Google Login → Verify Token → Find by Email → Update OAuth Provider → Create Session
```

## 🛡️ **Security Features**

### **Token Security**
- ✅ **Server-side verification only** - Never trust client tokens
- ✅ **Encrypted token storage** - OAuth tokens encrypted in database
- ✅ **Token expiration handling** - Automatic refresh and cleanup
- ✅ **State parameter validation** - CSRF protection

### **Account Security**
- ✅ **Email verification** - OAuth emails are pre-verified
- ✅ **Role-based access control** - Same RBAC as password login
- ✅ **Account linking validation** - Prevent unauthorized linking
- ✅ **Login method tracking** - Know how user can authenticate

## 🔧 **API Endpoints**

### **Google OAuth Login**
```http
POST /api/v1/auth/google
Content-Type: application/json

{
  "idToken": "google_id_token_here",
  "expectedRole": "customer" // or "admin", "employee"
}
```

### **Get Linked Providers**
```http
GET /api/v1/auth/oauth/providers
Authorization: Session required
```

### **Unlink Provider**
```http
POST /api/v1/auth/oauth/unlink
Content-Type: application/json
Authorization: Session required

{
  "provider": "google"
}
```

## 🎨 **Frontend Integration**

### **Google OAuth Button**
```typescript
const handleGoogleLogin = async () => {
  // Load Google OAuth script
  await loadGoogleScript()
  
  // Initialize Google OAuth
  window.google.accounts.oauth2.initCodeClient({
    client_id: process.env.VITE_GOOGLE_CLIENT_ID,
    scope: 'email profile',
    ux_mode: 'popup',
    callback: async (response) => {
      // Send to backend for verification
      const result = await fetch('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: response.credential,
          expectedRole: 'customer'
        })
      })
      
      // Handle response and store session
    }
  }).requestCode()
}
```

## 📊 **User Experience Scenarios**

### **Scenario 1: New Customer**
1. User clicks "Continue with Google"
2. Google OAuth popup appears
3. User authorizes the app
4. Backend creates new user account + OAuth provider
5. User is logged in with full access to cart, orders, etc.

### **Scenario 2: Existing Customer (Password)**
1. User has account with email/password
2. User clicks "Continue with Google" with same email
3. Backend finds existing user by email
4. Backend links Google OAuth to existing account
5. User can now login with either method
6. All data (cart, orders) remains the same

### **Scenario 3: Existing Customer (OAuth)**
1. User previously logged in with Google
2. User clicks "Continue with Google" again
3. Backend finds existing OAuth provider
4. User is logged in with same account
5. All data persists as expected

## 🔄 **Data Persistence**

### **Unified Data Storage**
- ✅ **Single user record** per email address
- ✅ **Multiple OAuth providers** can link to same user
- ✅ **Cart data** persists across login methods
- ✅ **Order history** unified regardless of login method
- ✅ **Preferences and settings** shared across methods

### **Session Management**
- ✅ **Same session system** for all login methods
- ✅ **Database-stored sessions** with access/refresh tokens
- ✅ **Session cleanup** on logout
- ✅ **Role-based access** maintained

## 🚀 **Implementation Benefits**

### **For Users**
- ✅ **Convenient login** - Use Google, Facebook, or password
- ✅ **No duplicate accounts** - Same data regardless of login method
- ✅ **Easy account recovery** - Multiple ways to access account
- ✅ **Seamless experience** - Cart and orders persist

### **For Business**
- ✅ **Higher conversion rates** - Easier registration/login
- ✅ **Reduced support tickets** - No duplicate account issues
- ✅ **Better user retention** - Multiple login options
- ✅ **Unified analytics** - Single user journey tracking

## 🔧 **Environment Setup**

### **Backend Environment Variables**
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### **Frontend Environment Variables**
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 📋 **Database Migration**

The system will automatically create the new `oauth_providers` table and update the `users` table with new fields:

```sql
-- New oauth_providers table
CREATE TABLE oauth_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_provider_id (provider, provider_id),
  INDEX idx_oauth_providers_user_id (user_id),
  INDEX idx_oauth_providers_email (email)
);

-- Updated users table
ALTER TABLE users 
ADD COLUMN avatar TEXT,
ADD COLUMN login_method ENUM('password', 'oauth', 'both') DEFAULT 'password',
MODIFY COLUMN password VARCHAR(255) NULL;
```

## 🎉 **Ready for Production**

This OAuth design provides:
- ✅ **Unified user experience** across all login methods
- ✅ **Secure token handling** with server-side verification
- ✅ **Flexible account linking** with multiple providers
- ✅ **Data persistence** regardless of login method
- ✅ **Role-based access control** maintained
- ✅ **Easy frontend integration** with Google OAuth

The system is designed to scale and can easily support additional OAuth providers (Facebook, Apple, etc.) using the same unified architecture.
