# Remaining Error Handling Implementation Guide

## Overview

The core error handling infrastructure is **complete and production-ready**. This document provides guidance for implementing error handling in the remaining components using the established patterns.

---

## Completed Infrastructure ✅

### Core Components (Ready to Use)
1. **ErrorBoundary** - Catches unhandled React errors
2. **NetworkStatusIndicator** - Real-time network monitoring
3. **SessionTimeoutMonitor** - Session expiry warnings
4. **apiService** - Complete error handling, retry, timeout, categorization
5. **AdminAuthContext** - Auth error handling with corrupted data detection
6. **EmployeeLogin** - Login error categorization and retry
7. **ImageUpload** - File validation and FileReader error handling

### Documentation ✅
- **ADMIN_ERROR_HANDLING_GUIDE.md** - Complete usage guide (613 lines)
- **ERROR_HANDLING_TEST_SCENARIOS.md** - 25+ test scenarios
- **ERROR_HANDLING_IMPLEMENTATION_SUMMARY.md** - Overview and stats

---

## Implementation Pattern (Copy-Paste Ready)

Use this pattern for any component that makes API calls:

```typescript
import { useState } from 'react';
import { apiService, ErrorCategory } from '../services/apiService';

function YourComponent() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.yourMethod();
      setData(response.data);
    } catch (err) {
      const errorInfo = apiService.extractErrorInfo(err);
      setError(errorInfo.message);
      setErrorCategory(errorInfo.category);
      
      // Show toast if available
      if (errorInfo.retryable) {
        showToast(errorInfo.message, {
          action: { label: 'Retry', onClick: fetchData }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
          <p className="text-sm text-red-800">{error}</p>
          {errorCategory === 'timeout' || errorCategory === 'network' || errorCategory === 'server' ? (
            <button 
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 underline"
            >
              Retry
            </button>
          ) : null}
        </div>
      )}

      {/* Loading State */}
      {loading && <p>Loading...</p>}

      {/* Data Display */}
      {data.map(item => ...)}
    </div>
  );
}
```

---

## Remaining Components to Enhance

### Phase 2: Critical Data Operations

#### 1. **Products.tsx** - Product CRUD Operations
**Location**: `frontend/src/admin/pages/Products.tsx`

**Needed**:
- Add error toast for create/update/delete operations
- Use apiService.extractErrorInfo() for error categorization
- Show retry button for retryable errors

**Example**:
```typescript
const handleCreateProduct = async (data: ProductData) => {
  try {
    await apiService.createProduct(data);
    showSuccessToast('Product created successfully');
  } catch (err) {
    const errorInfo = apiService.extractErrorInfo(err);
    showErrorToast(errorInfo.message, {
      action: errorInfo.retryable ? {
        label: 'Retry',
        onClick: () => handleCreateProduct(data)
      } : undefined
    });
  }
};
```

#### 2. **AddressManagement.tsx** - Address CRUD
**Location**: `frontend/src/admin/components/AddressManagement.tsx`

**Needed**:
- Field-level validation errors
- Display specific field errors below inputs
- Duplicate address detection

**Example**:
```typescript
interface FieldErrors {
  [field: string]: string;
}

const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

try {
  await apiService.createAddress(data);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  
  if (errorInfo.category === 'validation' && err.response?.data?.errors) {
    const errors: FieldErrors = {};
    err.response.data.errors.forEach((error: any) => {
      errors[error.field] = error.message;
    });
    setFieldErrors(errors);
  }
}

// Display
<input className={fieldErrors.street ? 'border-red-500' : ''} />
{fieldErrors.street && (
  <span className="text-red-600 text-sm">{fieldErrors.street}</span>
)}
```

#### 3. **Inventory.tsx** - Stock Management
**Location**: `frontend/src/admin/pages/Inventory.tsx`

**Needed**:
- Concurrent modification detection
- Insufficient stock warnings
- Validation errors for negative quantities

**Example**:
```typescript
try {
  await apiService.updateStock(productId, quantity);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  
  if (err.response?.status === 409) {
    showErrorToast('Stock was modified by another user. Please refresh and try again.');
  } else if (err.response?.data?.code === 'INSUFFICIENT_STOCK') {
    showErrorToast(`Insufficient stock. Available: ${err.response.data.available}`);
  } else {
    showErrorToast(errorInfo.message);
  }
}
```

#### 4. **PaymentManagement.tsx & PaymentLogs.tsx**
**Location**: `frontend/src/admin/pages/PaymentManagement.tsx` and `PaymentLogs.tsx`

**Needed**:
- Error categorization for payment fetching
- Retry mechanism for failed loads
- Timeout handling for slow payment queries

**Pattern**: Same as Products.tsx above

---

### Phase 3: Data Loading & Display

#### 5. **AdminContext.tsx** - Analytics Fetch
**Location**: `frontend/src/admin/context/AdminContext.tsx`

**Needed**:
- Error banner when analytics fetch fails
- Retry option
- Fallback/stale data indication

**Example**:
```typescript
const [analyticsError, setAnalyticsError] = useState<string | null>(null);

try {
  const analytics = await apiService.getAnalytics();
  setAnalytics(analytics);
  setAnalyticsError(null);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  setAnalyticsError(errorInfo.message);
}

// Display
{analyticsError && (
  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
    <p className="text-sm text-yellow-800">{analyticsError}</p>
    <button onClick={fetchAnalytics} className="text-sm text-yellow-600 underline mt-2">
      Retry
    </button>
  </div>
)}
```

#### 6. **useProducts.ts & useCategories.ts**
**Location**: `frontend/src/admin/hooks/useProducts.ts` and `useCategories.ts`

**Needed**:
- Add errorCategory state
- Expose retry function
- Use apiService.extractErrorInfo()

**Example Enhancement**:
```typescript
export const useProducts = () => {
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null);
  
  const fetchProducts = useCallback(async (filters: ProductFilters = {}) => {
    try {
      // ... existing code
    } catch (err) {
      const errorInfo = apiService.extractErrorInfo(err);
      setError(errorInfo.message);
      setErrorCategory(errorInfo.category);
    }
  }, []);
  
  const retryLastOperation = useCallback(async () => {
    setError(null);
    setErrorCategory(null);
    await fetchProducts();
  }, [fetchProducts]);

  return {
    // ... existing returns
    errorCategory,
    retryLastOperation,
    isRetryable: errorCategory === 'timeout' || errorCategory === 'network' || errorCategory === 'server'
  };
};
```

#### 7. **RefundManagement.tsx**
**Location**: `frontend/src/admin/pages/RefundManagement.tsx`

**Needed**:
- PayPal manual refund error handling
- Capture ID validation errors
- Network timeout handling for PayPal API

**Example**:
```typescript
try {
  await apiService.processRefund(refundData);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  
  if (err.response?.data?.code === 'INVALID_CAPTURE_ID') {
    showErrorToast('Invalid PayPal capture ID. Please verify and try again.');
  } else if (err.response?.data?.code === 'REFUND_ALREADY_PROCESSED') {
    showErrorToast('This refund has already been processed.');
  } else {
    showErrorToast(errorInfo.message, {
      action: errorInfo.retryable ? { label: 'Retry', onClick: () => handleRefund(refundData) } : undefined
    });
  }
}
```

---

### Phase 5: Forms & Modals

#### 8. **ProductModals.tsx**
**Location**: `frontend/src/admin/components/modals/ProductModals.tsx`

**Needed**:
- Field-specific validation errors
- List missing/invalid fields individually
- Clear errors on field change

**Pattern**: Similar to AddressManagement.tsx above

#### 9. **OrderModals.tsx**
**Location**: `frontend/src/admin/components/modals/OrderModals.tsx`

**Needed**:
- Order status update conflict detection
- Validation for status transitions
- Error handling for failed updates

**Example**:
```typescript
try {
  await apiService.updateOrderStatus(orderId, newStatus);
} catch (err) {
  const errorInfo = apiService.extractErrorInfo(err);
  
  if (err.response?.status === 409) {
    showErrorToast('Order status was changed by another user. Please refresh.');
  } else if (err.response?.data?.code === 'INVALID_STATUS_TRANSITION') {
    showErrorToast(`Cannot change from ${currentStatus} to ${newStatus}`);
  } else {
    showErrorToast(errorInfo.message);
  }
}
```

#### 10. **CustomerModals.tsx**
**Location**: `frontend/src/admin/components/modals/CustomerModals.tsx`

**Needed**:
- Validation error specifics
- Duplicate email detection
- Field-level error display

**Pattern**: Similar to AddressManagement.tsx

---

### Phase 6 (Optional): Toast System Enhancement

#### 11. **Enhanced Toast Notifications**
**Location**: Create `frontend/src/admin/utils/toast.ts`

**Needed**:
- Categorize toasts: success, error, warning, info
- Add retry action support
- Auto-dismiss with configurable timeout
- Queue management for multiple toasts

**Example Implementation**:
```typescript
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = (message: string, options?: ToastOptions) => {
  const type = options?.type || 'info';
  const duration = options?.duration || 5000;
  
  // Implementation depends on your toast library
  // Example with react-toastify or custom implementation
};

export const showSuccessToast = (message: string) => {
  showToast(message, { type: 'success' });
};

export const showErrorToast = (message: string, options?: ToastOptions) => {
  showToast(message, { type: 'error', duration: 7000, ...options });
};
```

---

## Quick Implementation Checklist

For each component you enhance:

- [ ] Import apiService and ErrorCategory
- [ ] Add error and errorCategory state
- [ ] Wrap API calls in try-catch
- [ ] Use apiService.extractErrorInfo(err)
- [ ] Display user-friendly error message
- [ ] Show retry button for retryable errors
- [ ] Handle loading state
- [ ] Clear errors on retry or user action
- [ ] Test with network offline, timeout, validation errors
- [ ] Log errors for debugging

---

## Testing Your Implementation

Use these quick tests:

1. **Network Offline**: DevTools → Network → Offline
2. **Timeout**: DevTools → Network → Slow 3G
3. **Validation**: Submit form with invalid data
4. **Server Error**: Mock API to return 500
5. **Success Case**: Normal operation

---

## Benefits of Following This Pattern

✅ **Consistent UX**: All errors look and behave the same
✅ **User-Friendly**: Clear messages, no technical jargon
✅ **Recoverable**: Retry buttons for transient errors
✅ **Debuggable**: Errors logged to console with context
✅ **Maintainable**: Single source of truth (apiService)
✅ **Type-Safe**: TypeScript throughout
✅ **Testable**: Clear error states to assert

---

## Example: Complete Component

Here's a complete example combining all patterns:

```typescript
import React, { useState, useEffect } from 'react';
import { apiService, ErrorCategory } from '../services/apiService';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCategory(null);
      
      const response = await apiService.getProducts();
      setProducts(response.data);
    } catch (err) {
      const errorInfo = apiService.extractErrorInfo(err);
      setError(errorInfo.message);
      setErrorCategory(errorInfo.category);
      
      console.error('[ProductsList] Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await apiService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorInfo = apiService.extractErrorInfo(err);
      setError(`Failed to delete product: ${errorInfo.message}`);
      setErrorCategory(errorInfo.category);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const canRetry = errorCategory === 'timeout' || 
                   errorCategory === 'network' || 
                   errorCategory === 'server';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
              {errorCategory && (
                <p className="text-xs text-red-600 mt-1">
                  Error Type: {errorCategory}
                </p>
              )}
            </div>
          </div>
          {canRetry && (
            <button
              onClick={fetchProducts}
              className="mt-3 flex items-center text-sm text-red-600 hover:text-red-700"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3 text-gray-600">Loading products...</span>
        </div>
      )}

      {/* Products List */}
      {!loading && !error && products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products found
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid gap-4">
          {products.map(product => (
            <div key={product.id} className="p-4 border rounded-lg">
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-gray-600">${product.price}</p>
              <button
                onClick={() => handleDelete(product.id)}
                className="mt-2 text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Summary

The error handling infrastructure is complete and ready to use. Each remaining component can be enhanced in **15-30 minutes** by following the patterns above. The system provides:

- ✅ Automatic retry with exponential backoff
- ✅ Error categorization (7 types)
- ✅ User-friendly messages
- ✅ Timeout protection
- ✅ Rate limit respect
- ✅ Network monitoring
- ✅ Session timeout warnings
- ✅ Corrupted data recovery
- ✅ Comprehensive documentation

Focus on user-facing components first (Products, Orders, Customers) as they have the highest impact.

