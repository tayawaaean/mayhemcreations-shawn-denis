/**
 * Error Boundary Component
 * Catches unhandled JavaScript errors in the component tree
 * Provides graceful error handling and recovery options
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Button from '../../components/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  // Lifecycle method called when error is caught
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  // Lifecycle method called after error is caught
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Silent error handling - no logging in production
  }

  // Handle retry action
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  // Handle reload page action
  handleReload = (): void => {
    window.location.reload();
  };

  // Handle go home action
  handleGoHome = (): void => {
    window.location.href = '/admin';
  };

  // Copy error details to clipboard (dev only)
  handleCopyError = (): void => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    
    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error details copied to clipboard');
    }).catch(() => {
      // Silent failure
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    // If there's an error, render error UI
    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            {/* Error icon and header */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-gray-600 text-center mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {/* Error count warning */}
            {errorCount > 1 && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This error has occurred {errorCount} times. 
                  You may need to refresh the page or contact support.
                </p>
              </div>
            )}

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-6 bg-gray-50 rounded-md">
                <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                  <Bug className="inline w-4 h-4 mr-2" />
                  Technical Details (development only)
                </summary>
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Message:</h3>
                    <pre className="text-xs bg-red-50 text-red-900 p-3 rounded overflow-x-auto">
                      {error?.message || 'Unknown error'}
                    </pre>
                  </div>
                  
                  {error?.stack && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Stack Trace:</h3>
                      <pre className="text-xs bg-gray-100 text-gray-800 p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {errorInfo?.componentStack && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Component Stack:</h3>
                      <pre className="text-xs bg-gray-100 text-gray-800 p-3 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  <button
                    onClick={this.handleCopyError}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Copy Error Details
                  </button>
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleRetry}
                variant="primary"
                size="lg"
                className="flex-1 flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={this.handleReload}
                variant="secondary"
                size="lg"
                className="flex-1 flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                size="lg"
                className="flex-1 flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Help text */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                If this problem persists, please contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return children;
  }
}

export default ErrorBoundary;

