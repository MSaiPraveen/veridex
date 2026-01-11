'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { Product, ProductScope, ProductPermission } from './types';
import { 
  ProductStatusBadge, 
  ComplianceBar, 
  ImportedBadge, 
  SyncStatusBadge,
  OriginBadge,
  PriceDisplay 
} from './ProductBadges';
import { Pagination } from '@/components/ui/table';

interface ProductsTableProps {
  products: Product[];
  scope: ProductScope;
  isLoading?: boolean;
  permissions: ProductPermission[];
  // Pagination
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  // Selection
  selectedIds: Set<string>;
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  // Sorting
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  // Actions
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onImport: (product: Product) => void;
  onViewAudit: (product: Product) => void;
}

export function ProductsTable({
  products,
  scope,
  isLoading,
  permissions,
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  selectedIds,
  onSelectAll,
  onSelectOne,
  sortColumn,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onDelete,
  onImport,
  onViewAudit,
}: ProductsTableProps) {
  const isGlobal = scope === 'global';
  const canEdit = permissions.includes('products:edit');
  const canDelete = permissions.includes('products:delete');
  const canImport = permissions.includes('products:import');
  
  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p._id));
  const someSelected = products.some(p => selectedIds.has(p._id)) && !allSelected;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12">
        <div className="flex flex-col items-center justify-center">
          <Icons.loader size={32} className="animate-spin text-primary-500 mb-4" />
          <p className="text-[var(--foreground-muted)]">Loading products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              {/* Checkbox */}
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500"
                />
              </th>
              
              {/* Product */}
              <SortableHeader
                label="Product"
                column="name"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className="min-w-[280px]"
              />
              
              {/* Category */}
              <SortableHeader
                label="Category"
                column="category"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className="w-32"
              />
              
              {/* Status */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-32">
                Status
              </th>
              
              {/* Price */}
              <SortableHeader
                label="Price"
                column="price"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className="w-28"
              />
              
              {/* Compliance */}
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-32">
                Compliance
              </th>
              
              {/* Origin / Sync (for org tab) */}
              {!isGlobal && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-32">
                  Origin
                </th>
              )}
              
              {/* Updated */}
              <SortableHeader
                label="Updated"
                column="updatedAt"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className="w-28"
              />
              
              {/* Actions */}
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-[var(--border)]">
            {products.map((product) => (
              <tr 
                key={product._id}
                className={`
                  group transition-colors
                  ${selectedIds.has(product._id) 
                    ? 'bg-primary-50/50 dark:bg-primary-900/10' 
                    : 'hover:bg-[var(--muted)]/50'
                  }
                `}
              >
                {/* Checkbox */}
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product._id)}
                    onChange={(e) => onSelectOne(product._id, e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500"
                  />
                </td>

                {/* Product */}
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                      <Icons.package size={18} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--foreground)] truncate">
                          {product.name}
                        </span>
                        {isGlobal && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            GLOBAL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.sku && (
                          <span className="text-xs font-mono text-[var(--foreground-muted)]">
                            {product.sku}
                          </span>
                        )}
                        {product.batchNumber && (
                          <>
                            <span className="text-[var(--foreground-muted)]">•</span>
                            <span className="text-xs text-[var(--foreground-muted)]">
                              Batch: {product.batchNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {product.category?.replace('_', ' ')}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <ProductStatusBadge status={product.status || 'DRAFT'} />
                </td>

                {/* Price */}
                <td className="px-4 py-3">
                  <PriceDisplay 
                    price={product.price} 
                    currency={product.currency}
                    isOverridden={!!product.overrides?.price}
                  />
                </td>

                {/* Compliance */}
                <td className="px-4 py-3">
                  <ComplianceBar status={product.complianceStatus} />
                </td>

                {/* Origin / Sync (for org tab) */}
                {!isGlobal && (
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {product.sourceProductId ? (
                        <>
                          <ImportedBadge importedAt={product.importedAt} />
                          {product.syncStatus && product.syncStatus !== 'LOCAL_ONLY' && (
                            <SyncStatusBadge status={product.syncStatus} />
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-[var(--foreground-muted)]">Local</span>
                      )}
                    </div>
                  </td>
                )}

                {/* Updated */}
                <td className="px-4 py-3">
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {formatDate(product.updatedAt)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* View */}
                    <ActionButton
                      onClick={() => onView(product)}
                      icon={<Icons.eye size={15} />}
                      tooltip="View details"
                    />
                    
                    {/* Audit (for org products) */}
                    {!isGlobal && (
                      <ActionButton
                        onClick={() => onViewAudit(product)}
                        icon={<Icons.clock size={15} />}
                        tooltip="View audit trail"
                      />
                    )}

                    {isGlobal ? (
                      /* Import action for global products */
                      canImport && (
                        <ActionButton
                          onClick={() => onImport(product)}
                          icon={<Icons.import size={15} />}
                          tooltip="Import to organization"
                          variant="primary"
                        />
                      )
                    ) : (
                      /* Edit/Delete for org products */
                      <>
                        {canEdit && (
                          <ActionButton
                            onClick={() => onEdit(product)}
                            icon={<Icons.edit size={15} />}
                            tooltip="Edit product"
                          />
                        )}
                        {canDelete && (
                          <ActionButton
                            onClick={() => onDelete(product)}
                            icon={<Icons.trash size={15} />}
                            tooltip="Delete product"
                            variant="danger"
                          />
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-[var(--border)] p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Sortable Header Component
// ============================================
interface SortableHeaderProps {
  label: string;
  column: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = sortColumn === column;
  
  return (
    <th 
      className={`px-4 py-3 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)] transition-colors ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <Icons.chevronDown 
          size={14} 
          className={`transition-transform ${isActive && sortDirection === 'asc' ? 'rotate-180' : ''} ${isActive ? 'text-primary-500' : 'opacity-50'}`}
        />
      </div>
    </th>
  );
}

// ============================================
// Action Button Component
// ============================================
interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  variant?: 'default' | 'primary' | 'danger';
}

function ActionButton({ onClick, icon, tooltip, variant = 'default' }: ActionButtonProps) {
  const variantClasses = {
    default: 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
    primary: 'text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30',
    danger: 'text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30',
  };

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2 rounded-lg transition-colors ${variantClasses[variant]}`}
    >
      {icon}
    </button>
  );
}
