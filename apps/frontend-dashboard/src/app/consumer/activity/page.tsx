'use client';

import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'view' | 'favorite' | 'compliance' | 'alert' | 'search';
  title: string;
  description: string;
  time: string;
  productId?: string;
  productName?: string;
}

// Mock activity data - in production, this would come from an API
const activityData: ActivityItem[] = [
  { id: '1', type: 'view', title: 'Viewed Product', description: 'CBD Oil 1000mg by GreenLeaf Labs', time: '2 minutes ago', productId: '1', productName: 'CBD Oil 1000mg' },
  { id: '2', type: 'compliance', title: 'Compliance Verified', description: 'Hemp Gummies 25mg passed all compliance checks', time: '1 hour ago', productId: '2', productName: 'Hemp Gummies 25mg' },
  { id: '3', type: 'favorite', title: 'Added to Favorites', description: 'Organic Hemp Extract by Pure Wellness Co', time: '3 hours ago', productId: '3', productName: 'Organic Hemp Extract' },
  { id: '4', type: 'alert', title: 'Status Changed', description: 'Full Spectrum Tincture is now non-compliant', time: '1 day ago', productId: '4', productName: 'Full Spectrum Tincture' },
  { id: '5', type: 'search', title: 'Searched Products', description: 'Query: "CBD oil organic"', time: '1 day ago' },
  { id: '6', type: 'view', title: 'Viewed Product', description: 'Pain Relief Balm by Pure Wellness Co', time: '2 days ago', productId: '5', productName: 'Pain Relief Balm' },
  { id: '7', type: 'favorite', title: 'Removed from Favorites', description: 'Daily Wellness Caps', time: '2 days ago', productId: '6', productName: 'Daily Wellness Caps' },
  { id: '8', type: 'view', title: 'Viewed Merchant', description: 'GreenLeaf Labs profile and products', time: '3 days ago' },
  { id: '9', type: 'compliance', title: 'Compliance Report Downloaded', description: 'CBD Oil 500mg compliance report', time: '4 days ago', productId: '7', productName: 'CBD Oil 500mg' },
  { id: '10', type: 'search', title: 'Searched Products', description: 'Query: "topical cream"', time: '5 days ago' },
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'view':
      return { icon: <Icons.eye size={16} className="text-white" />, color: 'bg-blue-500' };
    case 'favorite':
      return { icon: <Icons.heart size={16} className="text-white" />, color: 'bg-rose-500' };
    case 'compliance':
      return { icon: <Icons.shield size={16} className="text-white" />, color: 'bg-emerald-500' };
    case 'alert':
      return { icon: <Icons.alertTriangle size={16} className="text-white" />, color: 'bg-amber-500' };
    case 'search':
      return { icon: <Icons.search size={16} className="text-white" />, color: 'bg-violet-500' };
    default:
      return { icon: <Icons.activity size={16} className="text-white" />, color: 'bg-gray-500' };
  }
};

export default function ActivityPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Activity History"
        description="Track your recent activity on the platform"
        icon={<Icons.activity size={24} />}
      />

      <div className="mt-6 space-y-6">
        {/* Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Icons.eye size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">24</p>
                <p className="text-xs text-[var(--foreground-muted)]">Products Viewed</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Icons.shield size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">12</p>
                <p className="text-xs text-[var(--foreground-muted)]">Compliance Checks</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Icons.heart size={18} className="text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">8</p>
                <p className="text-xs text-[var(--foreground-muted)]">Favorites Added</p>
              </div>
            </div>
          </div>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Icons.search size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">15</p>
                <p className="text-xs text-[var(--foreground-muted)]">Searches Made</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--foreground)]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activityData.map((activity) => {
              const { icon, color } = getActivityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-[var(--muted)]/50 transition-colors flex items-start gap-4"
                >
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{activity.title}</p>
                        <p className="text-sm text-[var(--foreground-muted)] mt-0.5">{activity.description}</p>
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)] shrink-0">{activity.time}</span>
                    </div>
                    {activity.productId && (
                      <Link
                        href={`/consumer/products/${activity.productId}`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline mt-2"
                      >
                        View Product <Icons.chevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Load More */}
          <div className="p-4 border-t border-[var(--border)] text-center">
            <button className="text-sm text-[var(--primary)] hover:underline">
              Load more activity
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
