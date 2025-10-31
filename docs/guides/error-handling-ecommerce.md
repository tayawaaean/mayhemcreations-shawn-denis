# Error Handling Guide

This guide documents the comprehensive error handling system implemented in the ecommerce application.

## Components

### 1. ErrorBoundary Component
**Location:** `frontend/src/ecommerce/components/ErrorBoundary.tsx`

Catches JavaScript errors anywhere in the child component tree.

#### Usage:
```tsx
import ErrorBoundary from './components/ErrorBoundary'

<ErrorBoundary onError={(error, errorInfo) => console.log(error)}>
  <YourComponent />
</ErrorBoundary>
```

#### Features:
- Catches and displays unhandled React errors
- Shows user-friendly error message
- Provides "Try Again" and "Go Home" buttons
- Development mode shows error details and stack trace
- Tracks error count and warns after multiple occurrences
- Supports custom fallback UI
- Logs errors to external tracking service if available

---

### 2. NetworkStatusIndicator Component
**Location:** `frontend/src/ecommerce/components/NetworkStatusIndicator.tsx`

Displays a banner when internet connection is lost or restored.

#### Usage:
```tsx
import NetworkStatusIndicator from './components/NetworkStatusIndicator'

<NetworkStatusIndicator />
```

#### Features:
- Automatically detects online/offline status
- Shows warning banner when offline
- Shows success banner when reconnected
- Auto-dismisses reconnection message after 3 seconds
- Periodic connectivity checks every 30 seconds

---

### 3. useRetry Hook
**Location:** `frontend/src/ecommerce/hooks/useRetry.ts`

Custom React hook providing retry logic with exponential backoff.

#### Usage:
```tsx
import { useRetry } from '../hooks/useRetry'

function MyComponent() {
  const { execute, state } = useRetry()
  
  const fetchData = async () => {
    const result = await execute(
      () => apiService.getData(),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2
      }
    )
    return result
  }
  
  return (
    <div>
      {state.isRetrying && <p>Retrying... Attempt {state.attemptCount}</p>}
    </div>
  )
}
```

#### Options:
- `maxAttempts`: Maximum retry attempts (default: 3)
- `initialDelay`: Initial delay in ms (default: 1000)
- `maxDelay`: Maximum delay in ms (default: 10000)
- `backoffMultiplier`: Exponential multiplier (default: 2)
- `onRetry`: Callback on each retry
- `shouldRetry`: Custom retry condition function

---

### 4. API Helper Utilities
**Location:** `frontend/src/ecommerce/utils/apiHelpers.ts`

Utilities for API calls with timeout and retry logic.

#### Usage:
```tsx
import { apiCallWithTimeout, getApiErrorMessage } from '../utils/apiHelpers'

try {
  const data = await apiCallWithTimeout(
    () => fetch('/api/data').then(r => r.json()),
    { 
      timeout: 30000,
      retries: 2,
      retryDelay: 1000
    }
  )
} catch (error) {
  const message = getApiErrorMessage(error, 'data fetch')
  showError(message)
}
```

#### Functions:
- `apiCallWithTimeout<T>()`: Wraps API call with timeout
- `getApiErrorMessage()`: Creates user-friendly error messages
- `isRetryableError()`: Determines if error should be retried
- `getRetryDelay()`: Calculates optimal retry delay
- `createAbortController()`: Creates abort controller with timeout
- `withTimeout()`: Adds timeout to any promise
- `retryableApiCall()`: Executes API call with automatic retries

---

## Error Handling by Feature

### Cart Operations
**Files:** `Cart.tsx`, `CartContext.tsx`

#### Handled Errors:
1. **Cart Refresh Failures**
   - Authentication errors → Prompt to sign in
   - Network timeouts → Show connection error with retry
   - Server errors → Explain server issues
   - Generic errors → Fallback to cached data

2. **Cart Sync Failures**
   - Shows warning when sync fails
   - Explains data is saved locally
   - Notifies about cross-device sync issues

3. **localStorage Quota Exceeded**
   - Checks size before saving (3MB limit)
   - Shows specific guidance when full
   - Attempts to save minimal data as fallback
   - Recommends sign in for cloud sync

4. **Invalid Cart Items**
   - Shows confirmation before removal
   - Lists specific products being removed
   - Allows user to cancel cleanup

---

### Payment & Checkout
**Files:** `Payment.tsx`, `OrderCheckout.tsx`

#### Handled Errors:
1. **Address Validation**
   - Lists specific missing fields
   - Provides clear guidance on what to fix

2. **PayPal Payment Errors**
   - Duplicate payment detection
   - Declined payment guidance
   - Session expiration handling
   - Invalid data feedback
   - Server error recovery steps

3. **Shipping Rate Failures**
   - Timeout handling with retry
   - Offline detection
   - Invalid address feedback
   - Fallback to estimated rates

4. **Backend Product Loading**
   - Notifies when prices may be outdated
   - Recommends page refresh

---

### Product Display
**Files:** `Products.tsx`, `ProductPage.tsx`

#### Handled Errors:
1. **Product Loading Failures**
   - Categorized errors (timeout, offline, server, 404)
   - Retry button with loading state
   - Specific guidance for each error type

2. **Image Loading Failures**
   - Placeholder SVG for missing images
   - onError handlers for broken images
   - Validation before display

3. **Review Loading Failures**
   - Non-blocking yellow warning (not critical)
   - Retry functionality
   - Reassurance that purchase still works

4. **Review Image Parsing**
   - Validates JSON before parsing
   - Filters invalid image URLs
   - Fallback placeholders for broken images
   - Handles corrupted data gracefully

---

### Chat Widget
**Files:** `ChatWidget.tsx`

#### Handled Errors:
1. **File Upload Failures**
   - File size validation (5MB max)
   - File type validation (images, PDF, text)
   - FileReader error categorization:
     - NotFoundError, SecurityError, NotReadableError, EncodingError
   - Abort handling
   - Data validation before dispatch

2. **Message Send Failures**
   - Network timeout detection
   - Rate limiting (429) handling
   - Session expiration detection
   - Message preservation for retry
   - One-click retry button
   - Loading indicators

---

### Authentication
**Files:** `AuthContext.tsx`

#### Handled Errors:
1. **Auth Initialization Failures**
   - Validates stored auth data
   - Detects corrupted data
   - Clears invalid data automatically
   - Categorizes storage errors:
     - QuotaExceededError, SecurityError, Storage access errors

2. **Logout Failures**
   - Handles network errors gracefully
   - Clears local session regardless
   - Warns about active sessions on other devices

---

## Error Message Patterns

### Error Categorization:
1. **Network Errors**
   - Timeout: "Connection timeout. Please check your internet..."
   - Offline: "No internet connection. Please connect..."

2. **Server Errors**
   - 5xx: "Our server is having issues. Please try again..."
   - 404: "Resource not found..."
   - 429: "Too many requests. Please wait..."

3. **Authentication Errors**
   - 401: "Authentication expired. Please sign in again..."
   - 403: "Access denied..."

4. **Validation Errors**
   - Lists specific fields that need attention
   - Provides clear instructions on how to fix

5. **Data Errors**
   - Explains what data is corrupted
   - Provides recovery options

---

## Best Practices

### For Developers:

1. **Always Categorize Errors**
   ```tsx
   let errorMessage = 'Failed to load. '
   
   if (error?.message?.includes('timeout')) {
     errorMessage = 'Connection timeout...'
   } else if (!navigator.onLine) {
     errorMessage = 'No internet connection...'
   } else if (error?.response?.status >= 500) {
     errorMessage = 'Server error...'
   }
   ```

2. **Provide Retry Options**
   ```tsx
   const handleRetry = async () => {
     setIsRetrying(true)
     try {
       await operation()
     } catch (err) {
       setError(getApiErrorMessage(err))
     } finally {
       setIsRetrying(false)
     }
   }
   ```

3. **Use Fallbacks**
   ```tsx
   try {
     const data = await fetchFromServer()
     setData(data)
   } catch (error) {
     // Fallback to cached data
     const cached = localStorage.getItem('cached_data')
     if (cached) {
       setData(JSON.parse(cached))
       showWarning('Using cached data. Server unreachable.')
     }
   }
   ```

4. **Preserve User Data**
   ```tsx
   try {
     await sendMessage(text)
     setText('')
   } catch (error) {
     // Don't clear input - let user retry
     setError(error.message)
     setLastFailedMessage(text) // Save for retry
   }
   ```

5. **Add Timeout to All API Calls**
   ```tsx
   import { apiCallWithTimeout } from '../utils/apiHelpers'
   
   const data = await apiCallWithTimeout(
     () => apiService.getData(),
     { timeout: 30000 }
   )
   ```

---

## Testing Error Handling

### Manual Tests:

1. **Network Simulation**
   - Open DevTools → Network tab → Set to "Offline"
   - Verify offline banners appear
   - Test retry functionality

2. **Slow Network**
   - Network tab → Throttling → "Slow 3G"
   - Verify timeout handling
   - Test loading indicators

3. **File Upload**
   - Try uploading 10MB file → Should reject
   - Try .exe file → Should reject
   - Verify error messages

4. **Storage Quota**
   - Fill localStorage in console
   - Add cart items → Should handle quota errors

5. **JavaScript Errors**
   - Intentionally throw errors in components
   - Verify Error Boundary catches them

---

## Metrics & Monitoring

### Logged Events:
- Cart load failures
- Product loading errors
- Payment errors
- File upload failures
- Message send failures
- Auth initialization errors
- Network connectivity changes

### Console Patterns:
- `✅` Success operations
- `⚠️` Warnings and retries
- `❌` Final failures
- `🔄` Retry attempts
- `🛒` Cart operations
- `🔐` Auth operations

---

## Future Enhancements

1. **Error Tracking Integration**
   - Sentry/LogRocket integration
   - Error aggregation and alerting

2. **Enhanced Retry Logic**
   - Circuit breaker pattern
   - Adaptive retry delays

3. **Offline Mode**
   - Service worker for offline support
   - Queue operations for when online

4. **Performance Monitoring**
   - Track error rates
   - Monitor retry success rates
   - Alert on error spikes

