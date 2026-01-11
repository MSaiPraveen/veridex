'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icons } from '@/components/ui/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Here you could send to error reporting service
    // reportToErrorService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6">
              <Icons.alertTriangle size={32} className="text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              Something went wrong
            </h1>
            
            <p className="text-[var(--muted-foreground)] mb-6">
              An unexpected error occurred. Please try refreshing the page or return to the home page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-xs text-red-600 dark:text-red-300 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Icons.refreshCw size={16} />
                Refresh Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              >
                <Icons.home size={16} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
