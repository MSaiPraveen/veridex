'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

interface WatchlistItem {
  id: string;
  productId: string;
  productName: string;
  merchantName: string;
  category: string;
  previousStatus: 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT';
  currentStatus: 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT';
  statusChangedAt: string;
  alertType: 'status_change' | 'expiring_soon' | 'new_document' | 'compliance_issue';
  isRead: boolean;
}

// Mock watchlist data - in production, this would come from an API
const watchlistData: WatchlistItem[] = [
  {
    id: '1',
    productId: '1',
    productName: 'Full Spectrum Tincture',
    merchantName: 'GreenLeaf Labs',
    category: 'TINCTURES',
    previousStatus: 'COMPLIANT',
    currentStatus: 'NON_COMPLIANT',
    statusChangedAt: '2 hours ago',
    alertType: 'status_change',
    isRead: false,
  },
  {
    id: '2',
    productId: '2',
    productName: 'CBD Oil 500mg',
    merchantName: 'GreenLeaf Labs',
    category: 'CBD',
    previousStatus: 'PENDING',
    currentStatus: 'PENDING',
    statusChangedAt: '1 day ago',
    alertType: 'expiring_soon',
    isRead: false,
  },
  {
    id: '3',
    productId: '3',
    productName: 'Organic Hemp Extract',
    merchantName: 'Pure Wellness Co',
    category: 'CBD',
    previousStatus: 'PENDING',
    currentStatus: 'COMPLIANT',
    statusChangedAt: '2 days ago',
    alertType: 'status_change',
    isRead: true,
  },
  {
    id: '4',
    productId: '4',
    productName: 'Pain Relief Balm',
    merchantName: 'Pure Wellness Co',
    category: 'TOPICALS',
    previousStatus: 'COMPLIANT',
    currentStatus: 'COMPLIANT',
    statusChangedAt: '3 days ago',
    alertType: 'new_document',
    isRead: true,
  },
];

const statusColors: Record<string, string> = {
  COMPLIANT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NON_COMPLIANT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  COMPLIANT: <Icons.check size={12} />,
  NON_COMPLIANT: <Icons.x size={12} />,
  PENDING: <Icons.clock size={12} />,
};

const alertTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  status_change: {
    icon: <Icons.alertTriangle size={16} className="text-white" />,
    color: 'bg-amber-500',
    label: 'Status Changed',
  },
  expiring_soon: {
    icon: <Icons.clock size={16} className="text-white" />,
    color: 'bg-orange-500',
    label: 'Expiring Soon',
  },
  new_document: {
    icon: <Icons.fileText size={16} className="text-white" />,
    color: 'bg-blue-500',
    label: 'New Document',
  },
  compliance_issue: {
    icon: <Icons.shield size={16} className="text-white" />,
    color: 'bg-rose-500',
    label: 'Compliance Issue',
  },
};

export default function WatchlistPage() {
  const [items, setItems] = useState(watchlistData);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = items.filter(item => !item.isRead).length;
  const filteredItems = filter === 'unread' ? items.filter(item => !item.isRead) : items;

  const markAsRead = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isRead: true } : item
    ));
  };

  const markAllAsRead = () => {
    setItems(prev => prev.map(item => ({ ...item, isRead: true })));
  };

  const removeFromWatchlist = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Watchlist"
        description="Track products and receive alerts on compliance changes"
        icon={<Icons.bell size={24} />}
      />

      <div className="mt-6 space-y-6">
        {/* Alert Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Icons.bell size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{unreadCount}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Unread Alerts</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Icons.eye size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{items.length}</p>
                <p className="text-xs text-[var(--foreground-muted)]">Products Watched</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Icons.alertTriangle size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {items.filter(i => i.currentStatus === 'NON_COMPLIANT').length}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Non-Compliant</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Icons.check size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">
                  {items.filter(i => i.currentStatus === 'COMPLIANT').length}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">Compliant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Watchlist Items */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {filteredItems.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {filteredItems.map((item) => {
                const alertConfig = alertTypeConfig[item.alertType];
                return (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-[var(--muted)]/50 transition-colors ${
                      !item.isRead ? 'bg-[var(--primary)]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${alertConfig.color} flex items-center justify-center shrink-0`}>
                        {alertConfig.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/consumer/products/${item.productId}`}
                                className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                              >
                                {item.productName}
                              </Link>
                              {!item.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                              )}
                            </div>
                            <p className="text-sm text-[var(--foreground-muted)] mt-0.5">
                              {item.merchantName} • {item.category}
                            </p>
                          </div>
                          <span className="text-xs text-[var(--foreground-muted)] shrink-0">
                            {item.statusChangedAt}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-[var(--foreground-muted)]">Status:</span>
                          {item.previousStatus !== item.currentStatus && (
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColors[item.previousStatus]}`}>
                                {statusIcons[item.previousStatus]}
                                {item.previousStatus.replace('_', ' ')}
                              </span>
                              <Icons.chevronRight size={12} className="text-[var(--foreground-muted)]" />
                            </>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColors[item.currentStatus]}`}>
                            {statusIcons[item.currentStatus]}
                            {item.currentStatus.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <Link
                            href={`/consumer/products/${item.productId}`}
                            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
                          >
                            View Details <Icons.chevronRight size={12} />
                          </Link>
                          {!item.isRead && (
                            <button
                              onClick={() => markAsRead(item.id)}
                              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => removeFromWatchlist(item.id)}
                            className="text-xs text-rose-500 hover:text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-4">
                <Icons.bell size={32} className="text-[var(--foreground-muted)]" />
              </div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">No alerts</h3>
              <p className="text-sm text-[var(--foreground-muted)] max-w-sm mx-auto">
                {filter === 'unread'
                  ? 'All your alerts have been read. Switch to "All" to see your complete watchlist.'
                  : 'Your watchlist is empty. Add products to your favorites to track their compliance status.'}
              </p>
              <Link
                href="/consumer/products"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Icons.package size={16} />
                Browse Products
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
