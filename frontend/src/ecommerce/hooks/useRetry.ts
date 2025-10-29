import { useState, useCallback } from 'react'

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: any) => void
  shouldRetry?: (error: any) => boolean
}

export interface RetryState {
  isRetrying: boolean
  attemptCount: number
  lastError: Error | null
}

/**
 * Custom Hook for Retry Logic with Exponential Backoff
 * 
 * Provides a reusable retry mechanism for async operations with:
 * - Exponential backoff
 * - Configurable max attempts
 * - Custom retry conditions
 * - Progress tracking
 * 
 * Usage:
 * const { execute, state, reset } = useRetry()
 * 
 * const fetchData = async () => {
 *   const result = await execute(async () => {
 *     return await apiCall()
 *   }, {
 *     maxAttempts: 3,
 *     initialDelay: 1000
 *   })
 *   return result
 * }
 */
export function useRetry() {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null
  })

  /**
   * Execute a function with retry logic
   */
  const execute = useCallback(async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      onRetry,
      shouldRetry = (error: any) => {
        // Default: retry on network errors, timeouts, and 5xx server errors
        if (!navigator.onLine) return true
        if (error?.message?.includes('timeout')) return true
        if (error?.code === 'ECONNABORTED') return true
        if (error?.response?.status >= 500) return true
        return false
      }
    } = options

    let attempt = 0
    let lastError: Error | null = null

    while (attempt < maxAttempts) {
      try {
        setState(prev => ({
          ...prev,
          isRetrying: attempt > 0,
          attemptCount: attempt
        }))

        const result = await fn()
        
        // Success - reset state
        setState({
          isRetrying: false,
          attemptCount: 0,
          lastError: null
        })
        
        return result
      } catch (error: any) {
        lastError = error
        attempt++

        console.warn(`⚠️ Attempt ${attempt}/${maxAttempts} failed:`, error?.message || error)

        setState(prev => ({
          ...prev,
          attemptCount: attempt,
          lastError: error
        }))

        // Check if we should retry
        if (attempt < maxAttempts && shouldRetry(error)) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          )

          console.log(`🔄 Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxAttempts})`)

          // Call onRetry callback if provided
          if (onRetry) {
            onRetry(attempt, error)
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          // Max attempts reached or should not retry
          break
        }
      }
    }

    // All attempts failed
    setState({
      isRetrying: false,
      attemptCount: attempt,
      lastError: lastError
    })

    console.error(`❌ All ${attempt} attempts failed. Last error:`, lastError)
    throw lastError
  }, [])

  /**
   * Reset retry state
   */
  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null
    })
  }, [])

  return {
    execute,
    state,
    reset
  }
}

/**
 * Helper function to wrap API calls with timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const error = new Error(errorMessage)
        ;(error as any).code = 'ECONNABORTED'
        ;(error as any).timeout = true
        reject(error)
      }, timeoutMs)
    )
  ])
}

/**
 * Utility function to create a retryable API call
 */
export async function retryableApiCall<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions & { timeout?: number } = {}
): Promise<T> {
  const { timeout = 30000, ...retryOptions } = options

  // Create a single-use retry executor
  let attempt = 0
  const maxAttempts = retryOptions.maxAttempts || 3
  const initialDelay = retryOptions.initialDelay || 1000
  const maxDelay = retryOptions.maxDelay || 10000
  const backoffMultiplier = retryOptions.backoffMultiplier || 2
  const shouldRetry = retryOptions.shouldRetry || ((error: any) => {
    if (!navigator.onLine) return true
    if (error?.timeout || error?.message?.includes('timeout')) return true
    if (error?.code === 'ECONNABORTED') return true
    if (error?.response?.status >= 500) return true
    return false
  })

  while (attempt < maxAttempts) {
    try {
      const result = await withTimeout(apiCall(), timeout)
      return result
    } catch (error: any) {
      attempt++

      if (attempt < maxAttempts && shouldRetry(error)) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        )
        console.log(`🔄 Retrying API call in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }

  throw new Error('Max retry attempts reached')
}

