'use client';

import { ReactNode } from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Page State Types
 * Every admin page must handle these four states
 */
export type PageState = 'loading' | 'error' | 'empty' | 'success';

interface PageWrapperProps {
  children: ReactNode;
  /** Page title - displayed in header */
  title: string;
  /** Page description - optional subtitle */
  description?: string;
  /** Current state of the page */
  state?: PageState;
  /** Loading message */
  loadingMessage?: string;
  /** Error object or message */
  error?: Error | string | null;
  /** Retry handler for error state */
  onRetry?: () => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state action */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  /** Header actions (buttons, etc.) */
  headerActions?: ReactNode;
}

/**
 * PageWrapper - Enforces the data rendering contract
 * 
 * Every admin page MUST follow this contract:
 * - Loading state: Shows spinner + message
 * - Error state: Shows error panel + retry button
 * - Empty state: Shows empty message + optional action
 * - Success state: Shows children content
 * 
 * Blank screens are FORBIDDEN.
 */
export function PageWrapper({
  children,
  title,
  description,
  state = 'success',
  loadingMessage = 'Loading...',
  error,
  onRetry,
  emptyMessage = 'No data found',
  emptyDescription,
  emptyAction,
  headerActions,
}: PageWrapperProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="space-y-6">
      {/* Page Header - Always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Content States */}
      {state === 'loading' && <LoadingState message={loadingMessage} />}
      
      {state === 'error' && (
        <ErrorState 
          message={errorMessage || 'An unexpected error occurred'} 
          onRetry={onRetry} 
        />
      )}
      
      {state === 'empty' && (
        <EmptyState 
          message={emptyMessage}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
      
      {state === 'success' && children}
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Something went wrong
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

function EmptyState({ 
  message, 
  description,
  action 
}: { 
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {message}
      </h3>
      {description && (
        <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Hook to manage page state
 * Use this in your page components for consistent state management
 */
export function usePageState<T>(
  data: T | null | undefined,
  isLoading: boolean,
  error: Error | string | null
): PageState {
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) {
    return 'empty';
  }
  return 'success';
}
