'use client';

import { Icons } from '@/components/ui/icons';
import { Product, SyncStatus, LifecycleStage } from './types';

// ============================================
// Origin Badge - Shows if product is from Org or Global
// ============================================
interface OriginBadgeProps {
  scope: 'GLOBAL' | 'ORGANIZATION';
  size?: 'sm' | 'md';
}

export function OriginBadge({ scope, size = 'sm' }: OriginBadgeProps) {
  const isGlobal = scope === 'GLOBAL';
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  
  return (
    <span className={`
      inline-flex items-center gap-1 font-medium rounded-md
      ${sizeClasses}
      ${isGlobal 
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      }
    `}>
      {isGlobal ? <Icons.globe size={10} /> : <Icons.package size={10} />}
      {isGlobal ? 'Global' : 'Organization'}
    </span>
  );
}

// ============================================
// Imported Badge - Shows if product was imported from global
// ============================================
interface ImportedBadgeProps {
  importedAt?: string;
  importedBy?: string;
  size?: 'sm' | 'md';
}

export function ImportedBadge({ importedAt, size = 'sm' }: ImportedBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 font-medium rounded-md
        bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300
        ${sizeClasses}
      `}
      title={importedAt ? `Imported on ${new Date(importedAt).toLocaleDateString()}` : 'Imported from Global Catalog'}
    >
      <Icons.import size={10} />
      Imported
    </span>
  );
}

// ============================================
// Sync Status Badge - Shows sync state with global product
// ============================================
interface SyncStatusBadgeProps {
  status: SyncStatus;
  size?: 'sm' | 'md';
  showAction?: boolean;
  onReviewUpdates?: () => void;
}

export function SyncStatusBadge({ status, size = 'sm', showAction, onReviewUpdates }: SyncStatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  
  const config: Record<SyncStatus, { icon: React.ReactNode; label: string; classes: string }> = {
    IN_SYNC: {
      icon: <Icons.check size={10} />,
      label: 'In Sync',
      classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    OUT_OF_SYNC: {
      icon: <Icons.alertTriangle size={10} />,
      label: 'Out of Sync',
      classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    },
    DETACHED: {
      icon: <Icons.link size={10} />,
      label: 'Detached',
      classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    LOCAL_ONLY: {
      icon: <Icons.package size={10} />,
      label: 'Local Only',
      classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  const { icon, label, classes } = config[status];

  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 font-medium rounded-md ${sizeClasses} ${classes}`}>
        {icon}
        {label}
      </span>
      {showAction && status === 'OUT_OF_SYNC' && onReviewUpdates && (
        <button
          onClick={onReviewUpdates}
          className="text-[10px] text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline"
        >
          Review
        </button>
      )}
    </div>
  );
}

// ============================================
// Lifecycle Stage Badge
// ============================================
interface LifecycleBadgeProps {
  stage: LifecycleStage;
  size?: 'sm' | 'md';
}

export function LifecycleBadge({ stage, size = 'sm' }: LifecycleBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  
  const config: Record<LifecycleStage, { label: string; classes: string }> = {
    PROPOSED: {
      label: 'Proposed',
      classes: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    },
    APPROVED: {
      label: 'Approved',
      classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    },
    LIVE: {
      label: 'Live',
      classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    DEPRECATED: {
      label: 'Deprecated',
      classes: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    },
  };

  const { label, classes } = config[stage];

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-md ${sizeClasses} ${classes}`}>
      {label}
    </span>
  );
}

// ============================================
// Status Badge (Product Status)
// ============================================
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function ProductStatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  
  const config: Record<string, { dot: string; bg: string; text: string }> = {
    DRAFT: {
      dot: 'bg-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
    },
    PENDING_REVIEW: {
      dot: 'bg-yellow-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
    },
    APPROVED: {
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    REJECTED: {
      dot: 'bg-red-500',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
    },
    ARCHIVED: {
      dot: 'bg-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-500 dark:text-gray-400',
    },
  };

  const { dot, bg, text } = config[status] || config.DRAFT;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses} ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

// ============================================
// Compliance Score Bar
// ============================================
interface ComplianceBarProps {
  status?: string;
  score?: number;
  showLabel?: boolean;
}

export function ComplianceBar({ status, score, showLabel = true }: ComplianceBarProps) {
  const scores: Record<string, number> = {
    COMPLIANT: 100,
    NON_COMPLIANT: 30,
    PENDING: 50,
    EXPIRED: 20,
    REQUIRES_REVIEW: 70,
  };

  const colors: Record<string, { bar: string; text: string }> = {
    COMPLIANT: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    NON_COMPLIANT: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    PENDING: { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
    EXPIRED: { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
    REQUIRES_REVIEW: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  };

  const computedScore = score ?? (scores[status || 'PENDING'] || 50);
  const { bar, text } = colors[status || 'PENDING'] || colors.PENDING;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${bar}`}
          style={{ width: `${computedScore}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium tabular-nums ${text}`}>
          {computedScore}%
        </span>
      )}
    </div>
  );
}

// ============================================
// Price Display with Override Indicator
// ============================================
interface PriceDisplayProps {
  price?: number;
  currency?: string;
  isOverridden?: boolean;
}

export function PriceDisplay({ price, currency = 'USD', isOverridden }: PriceDisplayProps) {
  if (price === undefined) {
    return <span className="text-sm text-[var(--foreground-muted)]">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium text-[var(--foreground)] tabular-nums">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price)}
      </span>
      {isOverridden && (
        <span 
          className="text-[9px] px-1 py-0.5 bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 rounded font-medium"
          title="Price overridden from global default"
        >
          CUSTOM
        </span>
      )}
    </div>
  );
}

// ============================================
// Composite Product Badges Row
// ============================================
interface ProductBadgesProps {
  product: Product;
  showAll?: boolean;
}

export function ProductBadges({ product, showAll = false }: ProductBadgesProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {product.sourceProductId && (
        <ImportedBadge importedAt={product.importedAt} />
      )}
      {product.syncStatus && product.syncStatus !== 'LOCAL_ONLY' && (
        <SyncStatusBadge status={product.syncStatus} />
      )}
      {showAll && product.lifecycleStage && (
        <LifecycleBadge stage={product.lifecycleStage} />
      )}
    </div>
  );
}
