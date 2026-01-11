'use client';

import { Icons } from '@/components/ui/icons';
import { ProductFilters, GlobalProductFilters } from './types';

// ============================================
// Filter Options
// ============================================
const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

const categoryOptions = [
  { label: 'All Categories', value: '' },
  { label: 'Cannabis', value: 'CANNABIS' },
  { label: 'Hemp / CBD', value: 'HEMP_CBD' },
  { label: 'Supplement', value: 'SUPPLEMENT' },
  { label: 'Pharmaceutical', value: 'PHARMA' },
  { label: 'Peptide', value: 'PEPTIDE' },
  { label: 'Nutraceutical', value: 'NUTRA' },
];

const importStatusOptions = [
  { label: 'All Origins', value: '' },
  { label: 'Imported from Global', value: 'IMPORTED' },
  { label: 'Local Only', value: 'LOCAL_ONLY' },
];

const syncStatusOptions = [
  { label: 'All Sync Status', value: '' },
  { label: 'In Sync', value: 'IN_SYNC' },
  { label: 'Out of Sync', value: 'OUT_OF_SYNC' },
  { label: 'Detached', value: 'DETACHED' },
];

const availabilityOptions = [
  { label: 'All Availability', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Coming Soon', value: 'COMING_SOON' },
  { label: 'Deprecated', value: 'DEPRECATED' },
];

// ============================================
// Organization Products Filters
// ============================================
interface OrgFiltersProps {
  filters: ProductFilters;
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  onReset: () => void;
  resultCount?: number;
  isLoading?: boolean;
}

export function OrgProductsFilters({
  filters,
  onFilterChange,
  onReset,
  resultCount,
  isLoading,
}: OrgFiltersProps) {
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'search'
  ).length;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-col gap-4">
        {/* Search Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Icons.search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by name, SKU, or batch number..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <Icons.x size={14} />
              </button>
            )}
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={filters.status || ''}
              onChange={(value) => onFilterChange({ status: value as ProductFilters['status'] })}
              options={statusOptions}
              className="w-36"
            />
            <FilterSelect
              value={filters.category || ''}
              onChange={(value) => onFilterChange({ category: value })}
              options={categoryOptions}
              className="w-40"
            />
            <FilterSelect
              value={filters.importStatus || ''}
              onChange={(value) => onFilterChange({ importStatus: value as ProductFilters['importStatus'] })}
              options={importStatusOptions}
              className="w-44"
            />
            <FilterSelect
              value={filters.syncStatus || ''}
              onChange={(value) => onFilterChange({ syncStatus: value as ProductFilters['syncStatus'] })}
              options={syncStatusOptions}
              className="w-40"
            />
          </div>
        </div>

        {/* Results Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <Icons.loader size={14} className="animate-spin" />
                Loading...
              </div>
            ) : (
              <span className="text-sm text-[var(--foreground-muted)]">
                <strong className="text-[var(--foreground)]">{resultCount?.toLocaleString() || 0}</strong> products found
              </span>
            )}
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <Icons.x size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Global Products Filters
// ============================================
interface GlobalFiltersProps {
  filters: GlobalProductFilters;
  onFilterChange: (filters: Partial<GlobalProductFilters>) => void;
  onReset: () => void;
  resultCount?: number;
  isLoading?: boolean;
}

export function GlobalProductsFilters({
  filters,
  onFilterChange,
  onReset,
  resultCount,
  isLoading,
}: GlobalFiltersProps) {
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'search'
  ).length;

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-col gap-4">
        {/* Search Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Icons.search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search global catalog..."
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <Icons.x size={14} />
              </button>
            )}
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={filters.category || ''}
              onChange={(value) => onFilterChange({ category: value })}
              options={categoryOptions}
              className="w-40"
            />
            <FilterSelect
              value={filters.availability || ''}
              onChange={(value) => onFilterChange({ availability: value as GlobalProductFilters['availability'] })}
              options={availabilityOptions}
              className="w-40"
            />
          </div>
        </div>

        {/* Results Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <Icons.loader size={14} className="animate-spin" />
                Searching catalog...
              </div>
            ) : (
              <span className="text-sm text-[var(--foreground-muted)]">
                <strong className="text-[var(--foreground)]">{resultCount?.toLocaleString() || 0}</strong> products in catalog
              </span>
            )}
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <Icons.x size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Reusable Filter Select
// ============================================
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

function FilterSelect({ value, onChange, options, className = '' }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] 
        text-sm text-[var(--foreground)] 
        focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
        appearance-none cursor-pointer
        ${className}
      `}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
        paddingRight: '2.5rem',
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
