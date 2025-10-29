# Admin Error Handling Guide

## Overview

This guide documents the comprehensive error handling system implemented across the admin dashboard. The system provides robust error detection, categorization, user-friendly messaging, and recovery mechanisms.

## Table of Contents

1. [Error Categories](#error-categories)
2. [Infrastructure Components](#infrastructure-components)
3. [API Layer Error Handling](#api-layer-error-handling)
4. [Authentication Error Handling](#authentication-error-handling)
5. [Component-Level Error Handling](#component-level-error-handling)
6. [Best Practices](#best-practices)
7. [Testing Scenarios](#testing-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## Error Categories

All errors in the admin system are categorized into one of the following types:

### 1. **Timeout Errors**
- **Category Code**: `timeout`
- **Cause**: Request takes too long to complete (>30 seconds default)
- **User Message**: "Request timed out. The server is taking too long to respond."
- **Retryable**: Yes (automatic retry with exponential backoff)
- **User Action**: Wait or retry manually

### 2. **Network Errors**
- **Category Code**: `network`
- **Cause**: No internet connection or unable to reach server
- **User Message**: "No internet connection detected. Please check your network."
- **Retryable**: Yes
- **User Action**: Check internet connection, retry when online

### 3. **Server Errors**
- **Category Code**: `server`
- **Cause**: Server-side errors (500, 502, 503, etc.)
- **User Message**: "Server error. Our systems are experiencing issues."
- **Retryable**: Yes
- **User Action**: Wait and retry, or contact support

### 4. **Rate Limit Errors**
- **Category Code**: `rate_limit`
- **Cause**: Too many requests in short time (429 status)
- **User Message**: "Too many requests. Please wait X seconds before trying again."
- **Retryable**: No (must wait for retry-after period)
- **User Action**: Wait for specified time period

### 5. **Authentication Errors**
- **Category Code**: `auth`
- **Cause**: Invalid credentials or expired session (401, 403)
- **User Message**: "Authentication required. Please log in." or "Access denied."
- **Retryable**: No
- **User Action**: Re-authenticate or request permission

### 6. **Validation Errors**
- **Category Code**: `validation`
- **Cause**: Invalid input data (400-level errors)
- **User Message**: "Invalid request. Please check your input."
- **Retryable**: No
- **User Action**: Correct input and resubmit

### 7. **Not Found Errors**
- **Category Code**: `not_found`
- **Cause**: Resource doesn't exist (404)
- **User Message**: "The requested resource was not found."
- **Retryable**: No
- **User Action**: Verify resource exists or refresh data

---

## Infrastructure Components

### 1. ErrorBoundary Component

**Location**: `frontend/src/admin/components/ErrorBoundary.tsx`

**Purpose**: Catches unhandled JavaScript errors in the React component tree.

**Features**:
- Displays user-friendly error screen
- Shows technical details (collapsible)
- Provides retry, reload, and go home actions
- Logs errors to console (integrable with Sentry)
- Tracks error count to detect recurring issues
- Copies error details to clipboard for support

**Usage**:
```tsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

**Integration**: Already integrated in `AdminApp.tsx` and `EmployeeApp.tsx`.

### 2. NetworkStatusIndicator Component

**Location**: `frontend/src/admin/components/NetworkStatusIndicator.tsx`

**Purpose**: Monitors and displays real-time network connectivity status.

**Features**:
- Detects offline status via browser API
- Shows banner when offline
- Shows "back online" confirmation
- Tracks offline duration
- Periodic connectivity checks (every 30s)

**Usage**:
```tsx
<NetworkStatusIndicator />
```

**Props**:
- `showOnlineStatus` (boolean): Show indicator when online (default: false)
- `className` (string): Custom CSS classes

**Integration**: Automatically shown in admin apps.

### 3. SessionTimeoutMonitor Component

**Location**: `frontend/src/admin/components/SessionTimeoutMonitor.tsx`

**Purpose**: Warns users before session expires and provides extend option.

**Features**:
- Monitors user activity
- Shows warning 5 minutes before expiry
- Countdown timer with visual progress bar
- One-click session extension
- Graduated warning levels (normal, urgent, critical)
- Automatic logout on expiry

**Usage**:
```tsx
<SessionTimeoutMonitor 
  warningTimeMinutes={5}
  sessionTimeoutMinutes={30}
  onTimeout={() => console.log('Session expired')}
/>
```

**Props**:
- `warningTimeMinutes` (number): Minutes before expiry to warn (default: 5)
- `sessionTimeoutMinutes` (number): Total session duration (default: 30)
- `onTimeout` (function): Optional callback on timeout

**Warning Levels**:
- **Normal** (>60s remaining): Yellow banner, calm tone
- **Urgent** (30-60s remaining): Orange banner, emphasized
- **Critical** (<30s remaining): Red banner, pulsing animation

---

## API Layer Error Handling

### Enhanced apiService.ts

**Location**: `frontend/src/admin/services/apiService.ts`

**Key Features**:

#### 1. Automatic Error Categorization
```typescript
const errorInfo = apiService.extractErrorInfo(error);
console.log(errorInfo.category); // 'timeout', 'network', 'server', etc.
console.log(errorInfo.retryable); // true/false
console.log(errorInfo.message); // User-friendly message
```

#### 2. Automatic Retry with Exponential Backoff
```typescript
// Automatically retries retryable errors (up to 3 attempts)
const response = await apiService.getUsers();

// Skip retry for specific requests
const response = await apiService.request('/endpoint', { 
  skipRetry: true 
});
```

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: 1-2 seconds delay (with jitter)
- Attempt 3: 2-3 seconds delay (with jitter)
- Max delay capped at 10 seconds

#### 3. Timeout Handling
```typescript
// Default 30-second timeout
const response = await apiService.getUsers();

// Custom timeout
const response = await apiService.request('/endpoint', { 
  timeoutMs: 60000 // 60 seconds
});
```

#### 4. Rate Limit Respect
When a 429 error is received:
- Extracts `Retry-After` header
- Blocks retry until after wait period
- Shows user-friendly countdown

#### 5. Helper Methods
```typescript
// Check if error is retryable
if (apiService.isRetryableError(error)) {
  // Offer retry button
}

// Get user-friendly message
const message = apiService.getErrorMessage(error);
alert(message);

// Get full error details
const errorInfo = apiService.extractErrorInfo(error);
```

---

## Authentication Error Handling

### AdminAuthContext.tsx Enhancements

**Location**: `frontend/src/admin/context/AdminAuthContext.tsx`

**Key Features**:

#### 1. Corrupted Data Detection & Cleanup
```typescript
// Automatically detects:
- Missing required user fields
- Invalid data types
- Circular references
- Malformed JSON

// Automatic cleanup:
- Removes corrupted localStorage data
- Shows user notification
- Requests re-login
```

#### 2. Enhanced Error State Management
```typescript
const { error, clearError, retryAuth } = useAdminAuth();

// Display error to user
{error && <div>{error}</div>}

// Clear error
<button onClick={clearError}>Dismiss</button>

// Retry authentication
<button onClick={retryAuth}>Retry</button>
```

#### 3. Comprehensive Data Validation
- Validates auth state structure
- Checks user object integrity
- Verifies required fields
- Type checking for all data

#### 4. Retry Mechanism
- Automatic retry on transient errors (up to 3 attempts)
- Exponential backoff between retries
- Fallback to cleanup on persistent errors

### EmployeeLogin.tsx Enhancements

**Location**: `frontend/src/admin/components/EmployeeLogin.tsx`

**Key Features**:

#### 1. Error Categorization Display
```tsx
{error && (
  <div>
    <span>{error}</span>
    <span>Error Type: {errorCategory}</span>
  </div>
)}
```

#### 2. Conditional Retry Button
Shows retry button only for retryable errors (timeout, network, server).

#### 3. Auto-retry Logic
Automatically retries transient errors with exponential backoff (up to 2 attempts).

---

## Component-Level Error Handling

### Products Page (Example Pattern)

**Recommended Implementation**:

```tsx
import { useState } from 'react';
import { apiService } from '../services/apiService';

function Products() {
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<string | null>(null);

  const handleCreateProduct = async (data) => {
    try {
      setError(null);
      const response = await apiService.createProduct(data);
      
      if (response.success) {
        showSuccessToast('Product created successfully');
      }
    } catch (err) {
      const errorInfo = apiService.extractErrorInfo(err);
      setError(errorInfo.message);
      setErrorCategory(errorInfo.category);
      
      // Show error toast
      showErrorToast(errorInfo.message, {
        action: errorInfo.retryable ? {
          label: 'Retry',
          onClick: () => handleCreateProduct(data)
        } : undefined
      });
    }
  };

  return (
    <div>
      {error && (
        <ErrorBanner 
          message={error} 
          category={errorCategory}
          onRetry={errorInfo.retryable ? handleCreateProduct : undefined}
          onDismiss={() => setError(null)}
        />
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### Field-Level Validation Errors

For forms with multiple fields (e.g., AddressManagement, CustomerModals):

```tsx
interface FieldErrors {
  [field: string]: string;
}

const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

try {
  await apiService.createAddress(data);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  
  if (errorInfo.category === 'validation' && err.response?.data?.errors) {
    // Map validation errors to fields
    const errors: FieldErrors = {};
    err.response.data.errors.forEach(error => {
      errors[error.field] = error.message;
    });
    setFieldErrors(errors);
  }
}

// Display field errors
<input 
  name="street"
  className={fieldErrors.street ? 'border-red-500' : ''}
/>
{fieldErrors.street && (
  <span className="text-red-600 text-sm">{fieldErrors.street}</span>
)}
```

---

## Best Practices

### 1. Always Categorize Errors
```typescript
// Good
const errorInfo = apiService.extractErrorInfo(error);
showToast(errorInfo.message, errorInfo.category);

// Bad
showToast('An error occurred');
```

### 2. Provide Retry for Retryable Errors
```typescript
// Good
if (errorInfo.retryable) {
  showErrorToast(errorInfo.message, {
    action: { label: 'Retry', onClick: handleRetry }
  });
}

// Bad
showErrorToast(errorInfo.message); // No retry option
```

### 3. Give Specific Feedback
```typescript
// Good
"Failed to update product: Image file too large (max 5MB)"

// Bad
"Update failed"
```

### 4. Log Errors for Debugging
```typescript
try {
  await operation();
} catch (error) {
  console.error('[Products] Failed to delete product:', error);
  // User-friendly message to user
  showErrorToast('Failed to delete product. Please try again.');
}
```

### 5. Handle Loading and Error States
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleOperation = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    await operation();
  } catch (err) {
    setError(apiService.getErrorMessage(err));
  } finally {
    setIsLoading(false);
  }
};
```

### 6. Don't Show Technical Errors to Users
```typescript
// Good
"Server error. Please try again later."

// Bad
"TypeError: Cannot read property 'data' of undefined"
```

---

## Testing Scenarios

### 1. Network Offline Test
```javascript
// Simulate offline
Object.defineProperty(navigator, 'onLine', { 
  writable: true, 
  value: false 
});

// Trigger operation
// Expected: Network error message, retry option when back online
```

### 2. Timeout Test
```javascript
// In apiService.ts, temporarily set timeout to 1ms
const response = await apiService.request('/endpoint', { 
  timeoutMs: 1 
});

// Expected: Timeout error, automatic retry
```

### 3. Rate Limit Test
```javascript
// Make multiple rapid requests
for (let i = 0; i < 100; i++) {
  await apiService.getUsers();
}

// Expected: 429 error, retry-after message, no retry button
```

### 4. Server Error Test
```javascript
// Mock API to return 500
// Expected: Server error message, automatic retry, retry button
```

### 5. Validation Error Test
```javascript
// Submit form with invalid data
await apiService.createProduct({ name: '' }); // Missing required field

// Expected: Validation error, field-specific messages, no retry
```

### 6. Corrupted Auth Data Test
```javascript
// Corrupt localStorage data
localStorage.setItem('account_employee', '{"invalid": json');

// Refresh page
// Expected: Automatic cleanup, notification, redirect to login
```

### 7. Session Timeout Test
```javascript
// Wait for session timeout warning (5 minutes before expiry)
// Expected: Warning modal, countdown timer, extend button

// Don't extend, wait for expiry
// Expected: Automatic logout, redirect to login
```

### 8. JavaScript Error Test
```javascript
// Trigger unhandled error
throw new Error('Test error');

// Expected: ErrorBoundary catches it, shows error screen with retry
```

---

## Troubleshooting

### Issue: Errors Not Being Caught

**Solution**:
1. Ensure ErrorBoundary wraps your app
2. Check that async errors are caught in try-catch
3. Verify error is thrown, not just logged

### Issue: Retry Not Working

**Solution**:
1. Check error is categorized as retryable
2. Verify network connectivity
3. Ensure retry logic isn't being skipped

### Issue: Session Timeout Not Showing

**Solution**:
1. Verify SessionTimeoutMonitor is rendered
2. Check user is logged in
3. Verify session timeout settings

### Issue: Offline Indicator Not Showing

**Solution**:
1. Check NetworkStatusIndicator is rendered
2. Test with DevTools offline mode
3. Verify browser supports navigator.onLine

### Issue: Validation Errors Not Showing on Fields

**Solution**:
1. Check API returns errors in expected format
2. Verify field names match error keys
3. Ensure field error state is updated

---

## Integration Checklist

When adding error handling to a new component:

- [ ] Import apiService and error types
- [ ] Add error state variables (error, errorCategory, loading)
- [ ] Wrap API calls in try-catch
- [ ] Use apiService.extractErrorInfo() for error details
- [ ] Display user-friendly error messages
- [ ] Show retry button for retryable errors
- [ ] Handle field-level validation errors
- [ ] Log errors for debugging
- [ ] Test all error scenarios
- [ ] Add loading indicators
- [ ] Handle edge cases (empty state, no data, etc.)

---

## Summary

The admin error handling system provides:

✅ **7 error categories** with specific handling
✅ **Automatic retry** with exponential backoff
✅ **Timeout protection** (30s default, configurable)
✅ **Rate limit respect** with retry-after
✅ **Network status monitoring** with offline detection
✅ **Session timeout warnings** with extend option
✅ **Corrupted data recovery** with automatic cleanup
✅ **ErrorBoundary** for unhandled errors
✅ **User-friendly messages** for all error types
✅ **Retry mechanisms** for transient errors

This comprehensive system ensures admins always know what went wrong and how to recover, improving user experience and reducing support requests.

