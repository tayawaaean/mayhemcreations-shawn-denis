# Admin Error Handling Test Scenarios

## Overview

This document provides practical test scenarios to validate the comprehensive error handling system implemented across the admin dashboard.

---

## Test Environment Setup

### Prerequisites
1. Admin dashboard running locally or in test environment
2. Browser DevTools open (Network, Console tabs)
3. Admin/Employee account credentials
4. Access to modify network conditions

---

## Category 1: Network & Connectivity Tests

### Test 1.1: Offline Mode
**Objective**: Verify offline detection and user notification

**Steps**:
1. Log into admin dashboard
2. Open DevTools → Network tab
3. Enable "Offline" mode
4. Attempt any operation (e.g., load products, create order)

**Expected Results**:
- ✅ NetworkStatusIndicator shows offline banner at top
- ✅ Banner displays: "No Internet Connection" with offline icon
- ✅ API requests fail with network error
- ✅ Error message: "No internet connection detected. Please check your network."
- ✅ Retry button appears on errors

**Verification**:
```javascript
// Console should show:
// 🌐 Network: Offline detected
// ❌ API request failed [network]: Network error
```

### Test 1.2: Back Online Notification
**Objective**: Verify reconnection detection and confirmation

**Steps**:
1. Continue from Test 1.1 (offline mode)
2. Disable "Offline" mode in DevTools
3. Wait 2-3 seconds

**Expected Results**:
- ✅ Green "Back Online" banner appears
- ✅ Shows offline duration
- ✅ Banner auto-dismisses after 3 seconds

**Verification**:
```javascript
// Console should show:
// 🌐 Network: Back online
// You were offline for 1m 30s (example)
```

### Test 1.3: Slow Network (Timeout)
**Objective**: Verify timeout detection and retry mechanism

**Steps**:
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to Products page
4. Wait for timeout (30+ seconds)

**Expected Results**:
- ✅ Request times out after ~30 seconds
- ✅ Error message: "Request timed out. The server is taking too long to respond."
- ✅ Automatic retry attempts (up to 3 times)
- ✅ Retry button available after final attempt
- ✅ Loading indicator shows during attempts

**Verification**:
```javascript
// Console should show:
// ⏳ Retry attempt 1/3 after XXXms...
// ⏳ Retry attempt 2/3 after XXXms...
```

---

## Category 2: Authentication Tests

### Test 2.1: Corrupted Auth Data
**Objective**: Verify corrupted data detection and cleanup

**Steps**:
1. Log into admin dashboard
2. Open DevTools → Application → Local Storage
3. Find `account_employee` or `account_customer`
4. Corrupt the JSON: Change `{"user":...}` to `{"user":invalid}`
5. Refresh the page

**Expected Results**:
- ✅ System detects corrupted data
- ✅ Shows error: "Authentication data was corrupted and has been reset. Please log in again."
- ✅ Automatically clears corrupted localStorage
- ✅ Redirects to login page
- ✅ No console errors or crashes

**Verification**:
```javascript
// Console should show:
// ⚠️ Failed to parse account data
// 🧹 Cleaning up corrupted auth data...
// ✅ Corrupted data cleanup completed
```

### Test 2.2: Invalid Credentials
**Objective**: Verify login error categorization

**Steps**:
1. Navigate to login page (/admin/login or /employee/login)
2. Enter invalid email/password
3. Click "Sign In"

**Expected Results**:
- ✅ Error message: "Invalid email or password. Please check your credentials."
- ✅ Error type shown: "Authentication Failed"
- ✅ NO retry button (auth errors aren't retryable)
- ✅ Error clears when user modifies input

**Verification**:
```javascript
// Console should show:
// ❌ Login error: [AUTH] Invalid email or password
```

### Test 2.3: Session Timeout Warning
**Objective**: Verify session timeout monitoring and warning

**Steps**:
1. Log into admin dashboard
2. Reduce session timeout in SessionTimeoutMonitor (for testing):
   - Set `sessionTimeoutMinutes={1}` and `warningTimeMinutes={0.5}`
3. Wait for 30 seconds (warning threshold)
4. Observe warning modal

**Expected Results**:
- ✅ Yellow warning appears at bottom-right
- ✅ Shows countdown timer
- ✅ "Extend Session" button available
- ✅ Progress bar depletes over time
- ✅ Warning becomes more urgent as time decreases (orange → red)

**Verification**:
- Click "Extend Session" → Timer resets, warning disappears
- Don't extend → Auto-logout when timer reaches 0

### Test 2.4: Session Expiry
**Objective**: Verify automatic logout on session expiry

**Steps**:
1. Continue from Test 2.3
2. Let timer expire without extending

**Expected Results**:
- ✅ Automatic logout occurs
- ✅ Alert: "Your session has expired. Please log in again."
- ✅ Redirect to login page
- ✅ Auth data cleared from localStorage

---

## Category 3: Server Error Tests

### Test 3.1: Server 500 Error
**Objective**: Verify server error handling and retry

**Setup**: Mock API to return 500 error

**Steps**:
1. Use browser extension or intercept to mock 500 response
2. Perform any operation (e.g., load products)

**Expected Results**:
- ✅ Error message: "Server error. Our systems are experiencing issues."
- ✅ Automatic retry (up to 3 attempts)
- ✅ Manual retry button available
- ✅ Error category: "Server Error"

**Verification**:
```javascript
// Console should show:
// ❌ API request failed [server]: Server error
// ⏳ Retry attempt 1/3 after 1000ms...
```

### Test 3.2: Rate Limiting (429)
**Objective**: Verify rate limit detection and handling

**Setup**: Make many rapid requests to trigger rate limit

**Steps**:
1. Open browser console
2. Execute rapid requests:
```javascript
for (let i = 0; i < 100; i++) {
  fetch('/api/users', { credentials: 'include' });
}
```
3. Observe error response

**Expected Results**:
- ✅ Error message: "Too many requests. Please wait X seconds before trying again."
- ✅ Shows retry-after countdown
- ✅ NO retry button (must wait)
- ✅ Error category: "Rate Limited"

**Verification**:
```javascript
// Console should show:
// ❌ API request failed [rate_limit]: Too many requests
```

---

## Category 4: Validation Error Tests

### Test 4.1: Missing Required Fields
**Objective**: Verify field-level validation errors

**Steps**:
1. Navigate to Products page
2. Click "Add Product"
3. Leave required fields empty
4. Click "Save"

**Expected Results**:
- ✅ Error message: "Please fill in all required fields."
- ✅ Field-level errors shown:
  - "Name is required"
  - "Price is required"
  - etc.
- ✅ Error category: "Validation Error"
- ✅ NO retry button (need to fix input)

### Test 4.2: Invalid Data Format
**Objective**: Verify data type validation

**Steps**:
1. Navigate to Products page
2. Click "Add Product"
3. Enter invalid price (e.g., "abc")
4. Click "Save"

**Expected Results**:
- ✅ Error message: "Invalid price format. Please enter a number."
- ✅ Field highlighted in red
- ✅ Error clears when corrected

### Test 4.3: Duplicate Entry
**Objective**: Verify duplicate detection

**Steps**:
1. Create a product with name "Test Product"
2. Try to create another product with same name

**Expected Results**:
- ✅ Error message: "Product with this name already exists."
- ✅ Error category: "Validation Error"
- ✅ Suggests corrective action

---

## Category 5: UI Component Error Tests

### Test 5.1: JavaScript Error (ErrorBoundary)
**Objective**: Verify ErrorBoundary catches unhandled errors

**Steps**:
1. Trigger a JavaScript error in a component
2. For testing, add this to any component:
```jsx
<button onClick={() => { throw new Error('Test error'); }}>
  Trigger Error
</button>
```
3. Click the button

**Expected Results**:
- ✅ ErrorBoundary catches error
- ✅ Shows full-page error screen
- ✅ Displays: "Something Went Wrong"
- ✅ Shows error details (collapsible)
- ✅ Provides action buttons:
  - Try Again (resets error boundary)
  - Reload Page
  - Go Home
- ✅ "Copy Error Details" button works

**Verification**:
```javascript
// Console should show:
// 🚨 ErrorBoundary caught an error: Test error
// 📊 Error logged: { message, stack, componentStack, ... }
```

### Test 5.2: Image Upload Error
**Objective**: Verify file upload error handling

**Steps**:
1. Navigate to Products page
2. Click "Add Product"
3. Try to upload:
   - File >5MB
   - Invalid file type (e.g., .pdf)
   - Corrupted image file

**Expected Results**:
- ✅ File size error: "File too large. Maximum size is 5MB."
- ✅ File type error: "Invalid file type. Please upload JPG, PNG, or WebP."
- ✅ FileReader error: "Failed to read file. Please try another file."
- ✅ Errors shown immediately on file selection
- ✅ Upload button disabled until valid file selected

---

## Category 6: Data Loading Error Tests

### Test 6.1: Empty State Handling
**Objective**: Verify empty data handling

**Steps**:
1. Navigate to a page with no data (e.g., new database)
2. Observe empty state

**Expected Results**:
- ✅ Shows friendly empty state message
- ✅ Provides action to create first item
- ✅ NO error message shown (empty is valid state)

### Test 6.2: Failed Data Load
**Objective**: Verify error banner on data load failure

**Setup**: Mock API to fail on GET request

**Steps**:
1. Navigate to Products page
2. Mock API to return error

**Expected Results**:
- ✅ Error banner at top of page
- ✅ Message: "Failed to load products. [specific reason]"
- ✅ Retry button in banner
- ✅ Page remains functional (doesn't crash)
- ✅ Can retry or navigate away

---

## Category 7: CRUD Operation Error Tests

### Test 7.1: Create Operation Failure
**Steps**:
1. Try to create a product
2. Mock API to fail

**Expected Results**:
- ✅ Error toast: "Failed to create product: [reason]"
- ✅ Retry button in toast (if retryable)
- ✅ Form data preserved
- ✅ Can retry or cancel

### Test 7.2: Update Operation Conflict
**Steps**:
1. Open product for editing
2. Simulate another user updating same product
3. Try to save changes

**Expected Results**:
- ✅ Error: "This product was modified by another user. Please refresh and try again."
- ✅ Suggests refreshing data
- ✅ Option to overwrite or cancel

### Test 7.3: Delete Operation Failure
**Steps**:
1. Try to delete a product
2. Mock API to fail

**Expected Results**:
- ✅ Error toast: "Failed to delete product: [reason]"
- ✅ Product remains in list
- ✅ Retry button available
- ✅ Can cancel deletion

---

## Test Checklist

Use this checklist to verify all error handling scenarios:

### Network & Connectivity
- [ ] Offline detection and notification
- [ ] Back online confirmation
- [ ] Slow network timeout handling
- [ ] Automatic retry on network errors

### Authentication
- [ ] Corrupted auth data cleanup
- [ ] Invalid credentials error
- [ ] Session timeout warning (5 min before)
- [ ] Session timeout auto-logout
- [ ] Session extend functionality

### Server Errors
- [ ] 500 error handling and retry
- [ ] 502/503 error handling
- [ ] Rate limit (429) detection
- [ ] Retry-after respect

### Validation
- [ ] Missing required fields
- [ ] Invalid data format
- [ ] Duplicate entry detection
- [ ] Field-level error display

### UI Components
- [ ] ErrorBoundary catches errors
- [ ] Error screen shows details
- [ ] Retry/Reload/Go Home actions work
- [ ] Copy error details works

### Data Operations
- [ ] Empty state handling
- [ ] Failed data load
- [ ] Create operation errors
- [ ] Update operation conflicts
- [ ] Delete operation errors

### User Experience
- [ ] All errors have user-friendly messages
- [ ] Technical details hidden from users
- [ ] Retry buttons on retryable errors
- [ ] Loading indicators during operations
- [ ] Error states clear on retry/input change

---

## Automated Testing Script

Run this in browser console to test multiple scenarios:

```javascript
// Admin Error Handling Test Suite
const AdminErrorTests = {
  // Test 1: Network offline simulation
  testOffline: () => {
    Object.defineProperty(navigator, 'onLine', { 
      writable: true, 
      value: false 
    });
    console.log('✅ Test: Set offline mode');
  },
  
  // Test 2: Network back online
  testOnline: () => {
    Object.defineProperty(navigator, 'onLine', { 
      writable: true, 
      value: true 
    });
    console.log('✅ Test: Set online mode');
  },
  
  // Test 3: Corrupt auth data
  testCorruptAuth: () => {
    localStorage.setItem('account_employee', '{invalid json}');
    console.log('✅ Test: Corrupted auth data - refresh page to see cleanup');
  },
  
  // Test 4: Trigger rate limit
  testRateLimit: async () => {
    console.log('🔄 Test: Triggering rate limit with 50 requests...');
    for (let i = 0; i < 50; i++) {
      fetch('/api/users', { credentials: 'include' })
        .catch(e => console.log(`Request ${i} failed:`, e.message));
    }
  },
  
  // Test 5: Check error boundary
  testErrorBoundary: () => {
    throw new Error('Test error for ErrorBoundary');
  },
  
  // Run all tests
  runAll: async () => {
    console.log('🧪 Running Admin Error Handling Test Suite...\n');
    
    console.log('Test 1: Offline Mode');
    AdminErrorTests.testOffline();
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\nTest 2: Online Mode');
    AdminErrorTests.testOnline();
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\nTest 3: Rate Limit');
    await AdminErrorTests.testRateLimit();
    
    console.log('\n✅ Test suite completed. Check results above.');
    console.log('⚠️  Manual tests required:');
    console.log('   - Session timeout (wait 25+ minutes)');
    console.log('   - Form validation (try invalid inputs)');
    console.log('   - Corrupted auth (run testCorruptAuth then refresh)');
  }
};

// Usage: AdminErrorTests.runAll();
console.log('Admin Error Tests loaded. Run: AdminErrorTests.runAll()');
```

---

## Reporting Issues

When reporting error handling issues, include:

1. **Scenario**: Which test scenario failed
2. **Expected**: What should have happened
3. **Actual**: What actually happened
4. **Console Logs**: Relevant console output
5. **Screenshots**: Error messages/UI state
6. **Environment**: Browser, OS, environment (dev/staging/prod)
7. **Reproduction Steps**: Detailed steps to reproduce

---

## Summary

This test suite covers:
- ✅ 25+ test scenarios
- ✅ All 7 error categories
- ✅ Network, auth, server, validation, UI errors
- ✅ Retry mechanisms
- ✅ User experience validation
- ✅ Automated test scripts

Complete all tests to ensure robust error handling across the admin dashboard.

