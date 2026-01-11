'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { Product, ProductOverrides } from './types';

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onImport: (productId: string, overrides?: ProductOverrides, autoSync?: boolean) => Promise<void>;
  isImporting?: boolean;
}

export function ImportProductModal({
  isOpen,
  onClose,
  product,
  onImport,
  isImporting = false,
}: ImportProductModalProps) {
  const [overrides, setOverrides] = useState<ProductOverrides>({
    visibility: 'PUBLIC',
  });
  const [autoSync, setAutoSync] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen || !product) return null;

  const handleImport = async () => {
    await onImport(product._id, overrides, autoSync);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-lg bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <Icons.import size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Import Product
              </h2>
              <p className="text-sm text-[var(--foreground-muted)]">
                Add to your organization catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <Icons.x size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product Preview */}
          <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 flex items-center justify-center">
                <Icons.package size={24} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[var(--foreground)] truncate">
                  {product.name}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
                  {product.sku && <span className="font-mono">{product.sku}</span>}
                  {product.sku && product.category && <span className="mx-2">•</span>}
                  {product.category}
                </p>
                {product.description && (
                  <p className="text-sm text-[var(--foreground-muted)] mt-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Auto-Sync Option */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
            <input
              type="checkbox"
              id="autoSync"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="autoSync" className="flex-1 cursor-pointer">
              <span className="font-medium text-[var(--foreground)]">
                Auto-sync from global catalog
              </span>
              <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
                Automatically receive updates when the global product changes. You can still apply local overrides.
              </p>
            </label>
          </div>

          {/* Initial Overrides */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:text-primary-600 transition-colors"
            >
              <Icons.chevronDown 
                size={16} 
                className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
              Customize before importing
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                {/* Custom Price */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Custom Price (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={product.price?.toString() || '0.00'}
                      value={overrides.price || ''}
                      onChange={(e) => setOverrides({ ...overrides, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full h-10 pl-8 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                    />
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">
                    Leave empty to use global default price
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Visibility
                  </label>
                  <select
                    value={overrides.visibility || 'PUBLIC'}
                    onChange={(e) => setOverrides({ ...overrides, visibility: e.target.value as ProductOverrides['visibility'] })}
                    className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                  >
                    <option value="PUBLIC">Public - Visible to all</option>
                    <option value="PRIVATE">Private - Internal only</option>
                    <option value="RESTRICTED">Restricted - Limited access</option>
                  </select>
                </div>

                {/* Custom Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Custom Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add organization-specific description..."
                    value={overrides.description || ''}
                    onChange={(e) => setOverrides({ ...overrides, description: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border)] bg-[var(--muted)]/50">
          <p className="text-xs text-[var(--foreground-muted)]">
            <Icons.info size={12} className="inline mr-1" />
            A copy will be created in your organization
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Icons.loader size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Icons.import size={16} />
                  Import Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
