# Ecommerce Authentication Persistence Fix

## Issue
The ecommerce section was logging out users every time they refreshed the page, while the admin section maintained authentication persistence.

## Root Cause

The `centralizedAuthService.ts` had **automatic account switching logic** that was interfering with the ecommerce authentication:

### Problem Code (Lines 58-72):
```typescript
// Check if current account is customer but we have a valid employee account with admin role
if (currentAccount && currentAccount.user.role === 'customer') {
  const employeeAccount = MultiAccountStorageService.getAccountAuthData('employee');
  if (employeeAccount && MultiAccountStorageService.isAccountAuthenticated('employee')) {
    // Check if employee has admin role
    if (employeeAccount.user.role === 'admin' || employeeAccount.user.role === 'manager') {
      console.log('🔄 Auto-switching to employee account (admin role detected)');
      MultiAccountStorageService.switchAccount('employee');  // ❌ This was forcing a switch!
```

### What Happened:
1. User logs in to ecommerce as a **customer**
2. System stores customer auth data in localStorage
3. User refreshes the page
4. `centralizedAuthService` initializes and checks stored accounts
5. If an **admin/employee account** exists, it **auto-switches** to that account
6. Ecommerce `AuthContext` sees the current account is no longer "customer"
7. **Ecommerce logs the user out**

This auto-switching was intended for the admin section but was affecting the ecommerce section too.

---

## Solution

### Changes Made to `centralizedAuthService.ts`:

#### 1. Removed Auto-Switching on Initialization (Lines 53-66)

**Before:**
```typescript
private initializeFromStorage(): void {
  const currentAccount = MultiAccountStorageService.getCurrentAccountData();
  
  // Auto-switch to employee if customer is current but employee exists
  if (currentAccount && currentAccount.user.role === 'customer') {
    // ... auto-switch logic ...
  }
  
  if (currentAccount) {
    this.initializeFromAccount(currentAccount);
  }
}
```

**After:**
```typescript
private initializeFromStorage(): void {
  const currentAccount = MultiAccountStorageService.getCurrentAccountData();
  
  // DO NOT auto-switch accounts on initialization
  // Let each context (admin/ecommerce) manage their own account type
  // This prevents the ecommerce section from being logged out when page refreshes
  
  if (currentAccount) {
    this.initializeFromAccount(currentAccount);
  } else {
    this.clearAuthState();
  }
}
```

#### 2. Removed Auto-Switching in validateSession (Lines 155-157)

**Before:**
```typescript
// Check if we need to auto-switch to employee account
if (currentAccount.user.role === 'customer') {
  // ... auto-switch logic during validation ...
}
```

**After:**
```typescript
// DO NOT auto-switch accounts during validation
// Let each context handle their own account type preferences
```

#### 3. Fixed clearAuthState to Not Clear All Accounts (Lines 261-275)

**Before:**
```typescript
private clearAuthState(): void {
  this.authState = { ... };
  
  // Clear multi-account storage
  MultiAccountStorageService.clearAllAccounts();  // ❌ Cleared ALL accounts!
  
  this.notifyListeners();
}
```

**After:**
```typescript
private clearAuthState(): void {
  this.authState = { ... };
  
  // DO NOT clear multi-account storage here
  // Let the specific context (admin/ecommerce) handle logout
  // This preserves other account types when one context clears its state
  
  this.notifyListeners();
}
```

#### 4. Fixed logout Method (Lines 342-373)

**Before:**
```typescript
public async logout(): Promise<void> {
  // ... logging ...
  await apiClient.post('/auth/logout');
  
  this.clearAuthState();  // Only cleared memory, not storage properly
}
```

**After:**
```typescript
public async logout(): Promise<void> {
  // ... logging ...
  await apiClient.post('/auth/logout');
  
  // Logout from current account in multi-account storage
  await MultiAccountStorageService.logoutCurrentAccount();  // ✅ Proper storage cleanup
  
  this.clearAuthState();
}
```

---

## How It Works Now

### Multi-Account System:
The system now properly supports **both customer and employee accounts** simultaneously:

1. **Customer Account** (Ecommerce)
   - Stored separately in `MultiAccountStorageService`
   - 30-day session timeout
   - Persists through page refreshes
   - Independent from employee account

2. **Employee Account** (Admin)
   - Stored separately in `MultiAccountStorageService`
   - 30-day session timeout
   - Persists through page refreshes
   - Independent from customer account

3. **No Automatic Switching**
   - Each context (ecommerce/admin) manages its own preferred account type
   - No interference between sections
   - Users stay logged in to whichever section they're using

### Persistence Flow:

**Initial Login (Ecommerce):**
```
1. User logs in as customer
2. Auth data stored in localStorage: mayhem_multi_auth
   {
     customer: { user, session },
     currentAccount: 'customer'
   }
3. User state set in AuthContext
```

**Page Refresh:**
```
1. Page loads
2. centralizedAuthService initializes (NO AUTO-SWITCHING)
3. Ecommerce AuthContext initializes
4. AuthContext checks MultiAccountStorageService for 'customer' account
5. Finds valid customer auth data
6. ✅ User remains logged in!
```

**Switching to Admin:**
```
1. User navigates to /admin
2. Admin login (if not already logged in as employee)
3. Employee auth stored alongside customer auth:
   {
     customer: { ... },
     employee: { ... },
     currentAccount: 'employee'
   }
4. Admin section displays employee data
5. Ecommerce still has customer data available
```

---

## Testing

To verify the fix works:

### Test 1: Ecommerce Persistence
1. ✅ Log in to ecommerce as a customer
2. ✅ Navigate around the ecommerce site
3. ✅ Refresh the page
4. ✅ **Expected:** Still logged in as customer

### Test 2: Admin Persistence
1. ✅ Log in to admin as admin/employee
2. ✅ Navigate around admin section
3. ✅ Refresh the page
4. ✅ **Expected:** Still logged in as admin

### Test 3: Multi-Account Coexistence
1. ✅ Log in to ecommerce as customer
2. ✅ Navigate to /admin
3. ✅ Log in to admin as admin
4. ✅ Refresh on admin page
5. ✅ **Expected:** Still logged in to admin
6. ✅ Navigate back to ecommerce (/)
7. ✅ **Expected:** Still logged in as customer

### Test 4: Independent Logouts
1. ✅ Have both customer and admin accounts logged in
2. ✅ Logout from ecommerce
3. ✅ Navigate to /admin
4. ✅ **Expected:** Admin still logged in
5. ✅ Logout from admin
6. ✅ Navigate to ecommerce
7. ✅ **Expected:** Customer logged out (from step 2)

---

## Storage Structure

### LocalStorage Key: `mayhem_multi_auth`
```json
{
  "customer": {
    "user": {
      "id": 123,
      "email": "customer@example.com",
      "role": "customer",
      "firstName": "John",
      "lastName": "Doe",
      "accountType": "customer"
    },
    "session": {
      "sessionId": "session_123",
      "accessToken": "token_123",
      "refreshToken": "refresh_123",
      "lastActivity": "2025-10-12T..."
    }
  },
  "employee": {
    "user": {
      "id": 456,
      "email": "admin@example.com",
      "role": "admin",
      "firstName": "Admin",
      "lastName": "User",
      "accountType": "employee"
    },
    "session": {
      "sessionId": "session_456",
      "accessToken": "token_456",
      "refreshToken": "refresh_456",
      "lastActivity": "2025-10-12T..."
    }
  },
  "currentAccount": "customer"
}
```

---

## Files Modified

1. **frontend/src/shared/centralizedAuthService.ts**
   - Removed automatic account switching on initialization
   - Removed automatic account switching during session validation
   - Fixed `clearAuthState` to not clear all accounts
   - Fixed `logout` to properly clear current account from storage

---

## Benefits

✅ **Ecommerce customers stay logged in** through page refreshes
✅ **Admin users stay logged in** through page refreshes
✅ **Multi-account support** - can have both customer and employee accounts simultaneously
✅ **Independent logouts** - logging out of one doesn't affect the other
✅ **No interference** between ecommerce and admin sections
✅ **30-day persistence** for both account types

---

## Conclusion

The authentication persistence issue was caused by automatic account switching logic that was designed for convenience but interfered with multi-account coexistence. By removing the auto-switching and letting each context manage its own account type, both the ecommerce and admin sections now have proper persistent authentication.

