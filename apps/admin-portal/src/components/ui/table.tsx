'use client';

import { ReactNode, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Table Container
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50 ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
}

// Table Header
export function TableHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/80 ${className}`}>
      {children}
    </thead>
  );
}

// Table Body
export function TableBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <tbody className={`divide-y divide-slate-200 dark:divide-slate-700/50 ${className}`}>
      {children}
    </tbody>
  );
}

// Table Row
interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TableRow({ children, className = '', onClick, selected }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-800/30 
        ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''} 
        ${selected ? 'bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/15' : ''}
        transition-colors duration-100
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

// Table Head Cell
interface TableHeadProps {
  children?: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
}

export function TableHead({
  children,
  className = '',
  sortable,
  sorted,
  onSort,
  align = 'left'
}: TableHeadProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <th
      onClick={sortable ? onSort : undefined}
      className={`
        px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400
        ${alignClass}
        ${sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none' : ''}
        ${className}
      `}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortable && (
          <span className="flex flex-col">
            <ChevronUp className={`h-3 w-3 -mb-1 ${sorted === 'asc' ? 'text-amber-400' : 'text-slate-600'}`} />
            <ChevronDown className={`h-3 w-3 ${sorted === 'desc' ? 'text-amber-400' : 'text-slate-600'}`} />
          </span>
        )}
      </div>
    </th>
  );
}

// Table Cell
interface TableCellProps {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
  rowSpan?: number;
}

export function TableCell({ children, className = '', align = 'left', colSpan, rowSpan }: TableCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];

  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${alignClass} ${className}`}
    >
      {children}
    </td>
  );
}

// Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-900 dark:text-slate-200">{startItem}</span> to{' '}
        <span className="font-medium text-slate-900 dark:text-slate-200">{endItem}</span> of{' '}
        <span className="font-medium text-slate-900 dark:text-slate-200">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors
              ${page === currentPage
                ? 'bg-amber-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}
            `}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Sort hook for tables
export function useTableSort<T>(data: T[], defaultSort?: { key: keyof T; direction: 'asc' | 'desc' }) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(defaultSort || null);

  const sortedData = useCallback(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof T) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  return { sortedData: sortedData(), sortConfig, requestSort };
}
