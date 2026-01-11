'use client';

import { Icons } from '@/components/ui/icons';
import { ProductScope } from './types';

interface EmptyStateProps {
  scope: ProductScope;
  hasFilters?: boolean;
  onCreateProduct: () => void;
  onImportFromGlobal: () => void;
  onClearFilters: () => void;
}

export function ProductsEmptyState({
  scope,
  hasFilters = false,
  onCreateProduct,
  onImportFromGlobal,
  onClearFilters,
}: EmptyStateProps) {
  if (scope === 'organization') {
    if (hasFilters) {
      return (
        <OrgFilteredEmptyState onClearFilters={onClearFilters} />
      );
    }
    return (
      <OrgEmptyState 
        onCreateProduct={onCreateProduct} 
        onImportFromGlobal={onImportFromGlobal} 
      />
    );
  }

  return (
    <GlobalEmptyState 
      hasFilters={hasFilters} 
      onClearFilters={onClearFilters} 
    />
  );
}

// ============================================
// Organization Tab - No Products Yet
// ============================================
function OrgEmptyState({ 
  onCreateProduct, 
  onImportFromGlobal 
}: { 
  onCreateProduct: () => void; 
  onImportFromGlobal: () => void;
}) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12">
      <div className="max-w-md mx-auto text-center">
        {/* Illustration */}
        <div className="relative inline-flex mb-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center">
            <Icons.package size={40} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 flex items-center justify-center border-4 border-[var(--card)]">
            <Icons.plus size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          No products yet
        </h3>
        <p className="text-[var(--foreground-muted)] mb-8 leading-relaxed">
          Your product catalog is empty. Start by creating your first product or import from the global catalog to get started quickly.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onCreateProduct}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
          >
            <Icons.plus size={18} />
            Create Product
          </button>
          <button
            onClick={onImportFromGlobal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
          >
            <Icons.globe size={18} />
            Import from Global
          </button>
        </div>

        {/* Tip */}
        <div className="mt-8 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-left">
          <div className="flex items-start gap-3">
            <Icons.info size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Quick Tip
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Import products from the Global Catalog to leverage pre-configured compliance rules and templates. You can customize them for your organization afterward.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Organization Tab - No Results for Filters
// ============================================
function OrgFilteredEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12">
      <div className="max-w-md mx-auto text-center">
        {/* Illustration */}
        <div className="inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
            <Icons.search size={32} className="text-slate-400 dark:text-slate-500" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          No matching products
        </h3>
        <p className="text-[var(--foreground-muted)] mb-6">
          We couldn't find any products matching your current filters. Try adjusting your search criteria.
        </p>

        {/* Actions */}
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <Icons.x size={16} />
          Clear all filters
        </button>
      </div>
    </div>
  );
}

// ============================================
// Global Catalog Tab - Empty State
// ============================================
function GlobalEmptyState({ 
  hasFilters, 
  onClearFilters 
}: { 
  hasFilters: boolean; 
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12">
        <div className="max-w-md mx-auto text-center">
          {/* Illustration */}
          <div className="inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
              <Icons.search size={32} className="text-blue-400 dark:text-blue-500" />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No products found in catalog
          </h3>
          <p className="text-[var(--foreground-muted)] mb-6">
            Your search didn't match any products in the global catalog. Try different keywords or clear filters.
          </p>

          {/* Actions */}
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <Icons.x size={16} />
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12">
      <div className="max-w-md mx-auto text-center">
        {/* Illustration */}
        <div className="inline-flex mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
            <Icons.globe size={32} className="text-blue-500 dark:text-blue-400" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          Global Catalog is Empty
        </h3>
        <p className="text-[var(--foreground-muted)]">
          No products are available in the global catalog yet. Check back later or contact your administrator.
        </p>
      </div>
    </div>
  );
}
