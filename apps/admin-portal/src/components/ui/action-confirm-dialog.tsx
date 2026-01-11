'use client';

/**
 * Action Confirmation Dialog
 * 
 * Used for all destructive or significant admin actions.
 * Shows audit impact and requires explicit confirmation.
 */

import { ReactNode, useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';

type ActionSeverity = 'info' | 'warning' | 'danger';

interface ActionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  severity?: ActionSeverity;
  confirmText?: string;
  cancelText?: string;
  /** Audit impact message */
  auditMessage?: string;
  /** Require typing to confirm (for dangerous actions) */
  confirmPhrase?: string;
  /** Whether to require confirm phrase (alternative to passing confirmPhrase) */
  requireConfirmPhrase?: boolean;
  /** Show loading state */
  isLoading?: boolean;
  /** Additional content */
  children?: ReactNode;
}

const severityConfig: Record<ActionSeverity, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  danger: {
    icon: ShieldAlert,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export function ActionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  severity = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  auditMessage,
  confirmPhrase,
  requireConfirmPhrase = false,
  isLoading = false,
  children,
}: ActionConfirmDialogProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config = severityConfig[severity];
  const Icon = config.icon;

  // Use confirmPhrase if provided, or require typing confirmText if requireConfirmPhrase is true
  const requiredPhrase = confirmPhrase || (requireConfirmPhrase ? confirmText : undefined);
  const canConfirm = requiredPhrase ? typedPhrase === requiredPhrase : true;

  const handleConfirm = async () => {
    if (!canConfirm) {
      setError('Please type the confirmation phrase exactly');
      return;
    }

    try {
      await onConfirm();
      setTypedPhrase('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleClose = () => {
    setTypedPhrase('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 mx-4">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-full ${config.bgColor}`}>
            <Icon className={`h-6 w-6 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
        </div>

        {/* Additional content */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}

        {/* Audit notice */}
        {auditMessage && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-amber-500">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Audit Notice
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {auditMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation phrase input */}
        {confirmPhrase && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-mono text-red-600 dark:text-red-400">{confirmPhrase}</span> to confirm
            </label>
            <input
              type="text"
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder="Type confirmation phrase..."
              className="admin-input"
              autoComplete="off"
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="admin-button-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
            className={`admin-button ${severity === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : severity === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'admin-button-primary'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing confirmation dialogs
 */
export function useActionConfirmation<T = void>() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<T>) | null>(null);

  const requestConfirmation = (action: () => Promise<T>) => {
    setPendingAction(() => action);
    setIsOpen(true);
  };

  const confirm = async (): Promise<T | undefined> => {
    if (!pendingAction) return;

    setIsLoading(true);
    try {
      const result = await pendingAction();
      setIsOpen(false);
      setPendingAction(null);
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const cancel = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  return {
    isOpen,
    isLoading,
    requestConfirmation,
    confirm,
    cancel,
  };
}
