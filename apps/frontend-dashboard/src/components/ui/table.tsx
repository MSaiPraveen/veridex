"use client";

import { Icons } from "./icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Column<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  showCheckbox?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any> = Record<string, any>>({
  columns,
  data,
  keyField = "_id",
  isLoading = false,
  emptyMessage = "No data available",
  emptyTitle,
  emptyAction,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectedIds = [],
  onSelect,
  showCheckbox = false,
}: DataTableProps<T>) {
  const handleSelectAll = () => {
    if (!onSelect) return;
    if (selectedIds.length === data.length) {
      onSelect([]);
    } else {
      onSelect(data.map((item, idx) => String(item[keyField] ?? idx)));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelect) return;
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((i) => i !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center">
        <Icons.loader size={32} className="animate-spin text-primary-500 mb-4" />
        <p className="text-[var(--foreground-muted)]">Loading data...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center">
        <Icons.package size={48} className="text-[var(--foreground-muted)] mb-4" />
        {emptyTitle && <h3 className="font-medium text-[var(--foreground)] mb-2">{emptyTitle}</h3>}
        <p className="text-[var(--foreground-muted)] mb-4">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              {showCheckbox && (
                <th className="px-6 py-4 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--border)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-left text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer hover:text-[var(--foreground)]" : ""
                  } ${col.className || ""}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {col.sortable && (
                      <Icons.chevronDown
                        size={14}
                        className={`transition-transform ${
                          sortColumn === col.key && sortDirection === "asc"
                            ? "rotate-180"
                            : ""
                        } ${
                          sortColumn === col.key
                            ? "text-primary-500"
                            : "text-[var(--foreground-muted)]"
                        }`}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map((item) => {
              const id = String(item[keyField]);
              return (
                <tr
                  key={id}
                  className={`table-row ${onRowClick ? "cursor-pointer" : ""} ${
                    selectedIds.includes(id) ? "bg-primary-500/5" : ""
                  }`}
                  onClick={() => onRowClick?.(item)}
                >
                  {showCheckbox && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => handleSelectRow(id)}
                        className="rounded border-[var(--border)]"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.className || ""}`}>
                      {col.render
                        ? col.render(item)
                        : String(item[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
    </div>
  );
}

interface PaginationProps {
  page?: number;
  currentPage?: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page: pageProp,
  currentPage,
  totalPages,
  total = 0,
  limit = 10,
  onPageChange,
}: PaginationProps) {
  const page = currentPage ?? pageProp ?? 1;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total || page * limit);

  return (
    <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
      <p className="text-sm text-[var(--foreground-muted)]">
        Showing <span className="font-medium">{start}</span> to{" "}
        <span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="btn btn-secondary py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`btn btn-secondary py-2 px-3 ${
                page === pageNum
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : ""
              }`}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="btn btn-secondary py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Status Badge component
interface StatusBadgeProps {
  status?: string | null;
  variant?: "product" | "document" | "compliance" | "rule" | "success" | "error" | "warning" | "info" | "neutral";
}

export function StatusBadge({ status, variant = "product" }: StatusBadgeProps) {
  // Handle undefined/null status
  const displayStatus = status || 'PENDING';
  
  // Direct style variants
  const directStyles: Record<string, string> = {
    success: "badge-success",
    error: "badge-error",
    warning: "badge-warning",
    info: "badge-info",
    neutral: "badge-secondary",
  };

  // If using a direct color variant
  if (directStyles[variant]) {
    return <span className={`badge ${directStyles[variant]}`}>{displayStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>;
  }

  const styles: Record<string, Record<string, string>> = {
    product: {
      DRAFT: "badge-secondary",
      PENDING_REVIEW: "badge-warning",
      PENDING: "badge-warning",
      APPROVED: "badge-success",
      COMPLIANT: "badge-success",
      REJECTED: "badge-error",
      NON_COMPLIANT: "badge-error",
      ARCHIVED: "badge-secondary",
    },
    document: {
      PENDING: "badge-warning",
      PROCESSING: "badge-info",
      APPROVED: "badge-success",
      REJECTED: "badge-error",
      EXPIRED: "badge-error",
    },
    compliance: {
      COMPLIANT: "badge-success",
      NON_COMPLIANT: "badge-error",
      PENDING: "badge-warning",
      EXPIRED: "badge-error",
      REQUIRES_REVIEW: "badge-info",
    },
    rule: {
      BLOCKER: "badge-error",
      WARNING: "badge-warning",
      ACTIVE: "badge-success",
      INACTIVE: "badge-secondary",
      DRAFT: "badge-info",
    },
  };

  const labels: Record<string, Record<string, string>> = {
    product: {
      DRAFT: "Draft",
      PENDING_REVIEW: "Pending",
      PENDING: "Pending",
      APPROVED: "Approved",
      COMPLIANT: "Compliant",
      REJECTED: "Rejected",
      NON_COMPLIANT: "Non-Compliant",
      ARCHIVED: "Archived",
    },
    document: {
      PENDING: "Pending",
      PROCESSING: "Processing",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      EXPIRED: "Expired",
    },
    compliance: {
      COMPLIANT: "Compliant",
      NON_COMPLIANT: "Non-Compliant",
      PENDING: "Pending",
      EXPIRED: "Expired",
      REQUIRES_REVIEW: "Review",
    },
    rule: {
      BLOCKER: "Blocker",
      WARNING: "Warning",
    },
  };

  const styleClass = styles[variant]?.[displayStatus] || "badge-secondary";
  const label = labels[variant]?.[displayStatus] || displayStatus.replace(/_/g, ' ');

  return <span className={`badge ${styleClass}`}>{label}</span>;
}
