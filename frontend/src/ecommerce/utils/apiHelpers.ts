/**
 * API Helper Utilities
 * 
 * Provides utilities for handling API calls with timeout and retry logic
 */

import { retryableApiCall, withTimeout } from '../hooks/useRetry'

export interface ApiRequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  onRetry?: (attempt: number, error: any) => void
}

/**
 * Wrapper for API calls with automatic timeout handling
 * 
 * Usage:
 * const data = await apiCallWithTimeout(
 *   () => fetch('/api/data').then(r => r.json()),
 *   { timeout: 30000 }
 * )
 */
export async function apiCallWithTimeout<T>(
  apiCall: () => Promise<T>,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    timeout = 30000, // 30 seconds default
    retries = 0, // No retries by default
    retryDelay = 1000,
    onRetry
  } = options

  if (retries > 0) {
    // Use retry logic
    return retryableApiCall(apiCall, {
      timeout,
      maxAttempts: retries + 1,
      initialDelay: retryDelay,
      onRetry
    })
  } else {
    // Just add timeout
    return withTimeout(apiCall(), timeout, 'API request timeout')
  }
}

/**
 * Create an API call error message based on error type
 */
export function getApiErrorMessage(error: any, operation: string = 'operation'): string {
  if (error?.timeout || error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
    return `The ${operation} timed out. Please check your internet connection and try again.`
  }
  
  if (!navigator.onLine) {
    return `No internet connection. Please check your network and try again.`
  }
  
  if (error?.response?.status === 401) {
    return `Authentication failed. Please sign in again.`
  }
  
  if (error?.response?.status === 403) {
    return `Access denied. You don't have permission to perform this ${operation}.`
  }
  
  if (error?.response?.status === 404) {
    return `Resource not found. The requested data may no longer exist.`
  }
  
  if (error?.response?.status === 429) {
    return `Too many requests. Please wait a moment and try again.`
  }
  
  if (error?.response?.status >= 500) {
    return `Server error during ${operation}. Please try again in a few moments.`
  }
  
  if (error?.message) {
    return error.message
  }
  
  return `Failed to complete ${operation}. Please try again.`
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (!navigator.onLine) return true
  
  // Timeout errors
  if (error?.timeout || error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
    return true
  }
  
  // Server errors (5xx)
  if (error?.response?.status >= 500) return true
  
  // Rate limiting (429) - retryable after delay
  if (error?.response?.status === 429) return true
  
  return false
}

/**
 * Get suggested retry delay based on error type
 */
export function getRetryDelay(error: any, attempt: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 10000 // 10 seconds
  
  // Rate limiting - respect Retry-After header if available
  if (error?.response?.status === 429) {
    const retryAfter = error?.response?.headers?.['retry-after']
    if (retryAfter) {
      return parseInt(retryAfter) * 1000
    }
    return 5000 // 5 seconds default for rate limiting
  }
  
  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 1000 // Add up to 1 second random jitter
  
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Abort controller with timeout
 */
export function createAbortController(timeoutMs: number = 30000): {
  controller: AbortController
  signal: AbortSignal
} {
  const controller = new AbortController()
  
  setTimeout(() => {
    controller.abort()
  }, timeoutMs)
  
  return {
    controller,
    signal: controller.signal
  }
}

export default {
  apiCallWithTimeout,
  getApiErrorMessage,
  isRetryableError,
  getRetryDelay,
  createAbortController
}

