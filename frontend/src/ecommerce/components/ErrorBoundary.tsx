import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Button from '../../components/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('🔴 ErrorBoundary caught an error:', error, errorInfo)
    
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Call optional error handler prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to external error tracking service if available
    if (typeof window !== 'undefined' && (window as any).logError) {
      (window as any).logError(error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex flex-col items-center text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We've encountered an unexpected error. Don't worry - your data is safe.
              </p>

              {/* Error Details (development mode) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="w-full mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Error Details:</p>
                  <p className="text-xs text-red-600 font-mono mb-2 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer font-semibold mb-1">Stack Trace</summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Error Count Warning */}
              {this.state.errorCount > 2 && (
                <div className="w-full mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠️ This error has occurred {this.state.errorCount} times. 
                    You may need to clear your browser cache or contact support.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={this.handleReset}
                  variant="primary"
                  size="md"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="md"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Additional Help */}
              <div className="mt-6 pt-6 border-t border-gray-200 w-full">
                <p className="text-sm text-gray-600 mb-2">Need help?</p>
                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <button
                    onClick={this.handleReload}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Reload Page
                  </button>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <a
                    href="/contact"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Contact Support
                  </a>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <button
                    onClick={() => {
                      localStorage.clear()
                      sessionStorage.clear()
                      window.location.reload()
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear Cache & Reload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

