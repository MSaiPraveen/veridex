'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { Product, ProductScope, ProductPermission } from './types';

interface BulkActionsBarProps {
  scope: ProductScope;
  selectedProducts: Product[];
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onBulkImport: () => void;
  onBulkAssignCategory: () => void;
  permissions: ProductPermission[];
  isProcessing?: boolean;
}

export function BulkActionsBar({
  scope,
  selectedProducts,
  onClearSelection,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  onBulkImport,
  onBulkAssignCategory,
  permissions,
  isProcessing = false,
}: BulkActionsBarProps) {
  const count = selectedProducts.length;
  
  if (count === 0) return null;

  const canBulkActions = permissions.includes('products:bulk_actions');
  const canDelete = permissions.includes('products:delete') && canBulkActions;
  const canEdit = permissions.includes('products:edit') && canBulkActions;
  const canImport = permissions.includes('products:import') && canBulkActions;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-5 py-3 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-xl shadow-black/10 dark:shadow-black/30">
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-4 border-r border-[var(--border)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
              {count}
            </span>
          </div>
          <span className="text-sm text-[var(--foreground-muted)]">
            selected
          </span>
          <button
            onClick={onClearSelection}
            className="ml-1 p-1 rounded hover:bg-[var(--muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            title="Clear selection"
          >
            <Icons.x size={14} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {scope === 'organization' ? (
            <>
              {canEdit && (
                <>
                  <BulkActionButton
                    onClick={onBulkActivate}
                    icon={<Icons.check size={16} />}
                    label="Activate"
                    disabled={isProcessing}
                  />
                  <BulkActionButton
                    onClick={onBulkDeactivate}
                    icon={<Icons.x size={16} />}
                    label="Archive"
                    disabled={isProcessing}
                  />
                  <BulkActionButton
                    onClick={onBulkAssignCategory}
                    icon={<Icons.tag size={16} />}
                    label="Assign Category"
                    disabled={isProcessing}
                  />
                </>
              )}
              {canDelete && (
                <BulkActionButton
                  onClick={onBulkDelete}
                  icon={<Icons.trash size={16} />}
                  label="Delete"
                  variant="danger"
                  disabled={isProcessing}
                />
              )}
            </>
          ) : (
            <>
              {canImport && (
                <BulkActionButton
                  onClick={onBulkImport}
                  icon={<Icons.import size={16} />}
                  label={`Import ${count} Products`}
                  variant="primary"
                  disabled={isProcessing}
                />
              )}
            </>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 pl-4 border-l border-[var(--border)]">
            <Icons.loader size={16} className="animate-spin text-primary-500" />
            <span className="text-sm text-[var(--foreground-muted)]">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface BulkActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}

function BulkActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled,
}: BulkActionButtonProps) {
  const variantClasses = {
    default: 'text-[var(--foreground)] hover:bg-[var(--muted)]',
    primary: 'text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============================================
// Bulk Import Summary Modal
// ============================================
interface BulkImportSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  result?: {
    imported: number;
    skipped: number;
    errors: Array<{ productId: string; productName?: string; error: string }>;
  };
}

export function BulkImportSummary({ isOpen, onClose, result }: BulkImportSummaryProps) {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Icons.check size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Import Complete
              </h3>
              <p className="text-sm text-[var(--foreground-muted)]">
                Bulk import finished processing
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {result.imported}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Imported
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {result.skipped}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Skipped
              </div>
            </div>
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {result.errors.length}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                Errors
              </div>
            </div>
          </div>

          {/* Error List */}
          {result.errors.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
                Errors
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs"
                  >
                    <span className="font-medium text-red-700 dark:text-red-300">
                      {err.productName || err.productId}:
                    </span>
                    <span className="text-red-600 dark:text-red-400 ml-1">
                      {err.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
