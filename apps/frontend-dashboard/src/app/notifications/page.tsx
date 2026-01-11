'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  date: string;
  read: boolean;
  category: string;
}

// Mock notifications - replace with real API call
const getMockNotifications = (role?: string): Notification[] => {
  const baseNotifications: Notification[] = [];
  
  if (role === 'MERCHANT') {
    return [
      {
        id: '1',
        title: 'Document Approved',
        message: 'Your business license has been approved. You can now proceed with product listings.',
        type: 'success',
        time: '2:30 PM',
        date: 'Today',
        read: false,
        category: 'Documents',
      },
      {
        id: '2',
        title: 'Compliance Review Requested',
        message: 'A new compliance review has been requested for "Premium CBD Oil 1000mg".',
        type: 'warning',
        time: '11:00 AM',
        date: 'Today',
        read: false,
        category: 'Compliance',
      },
      {
        id: '3',
        title: 'Product Update',
        message: 'Your product listing "Hemp Extract Tincture" has been updated successfully.',
        type: 'info',
        time: '9:45 AM',
        date: 'Yesterday',
        read: true,
        category: 'Products',
      },
      {
        id: '4',
        title: 'Document Expiring Soon',
        message: 'Your lab report for "CBD Gummies" will expire in 15 days. Please upload a new one.',
        type: 'warning',
        time: '3:00 PM',
        date: 'Dec 28, 2025',
        read: true,
        category: 'Documents',
      },
      {
        id: '5',
        title: 'New Rule Applied',
        message: 'A new compliance rule "THC Content Verification" has been applied to your products.',
        type: 'info',
        time: '10:00 AM',
        date: 'Dec 27, 2025',
        read: true,
        category: 'Compliance',
      },
    ];
  }
  
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return [
      {
        id: '1',
        title: 'New Reviews Pending',
        message: '5 products are awaiting compliance review. Oldest pending: 2 days.',
        type: 'warning',
        time: '1:00 PM',
        date: 'Today',
        read: false,
        category: 'Reviews',
      },
      {
        id: '2',
        title: 'New Merchant Registered',
        message: 'Green Valley Farms has registered and submitted verification documents.',
        type: 'info',
        time: '10:30 AM',
        date: 'Today',
        read: false,
        category: 'Organizations',
      },
      {
        id: '3',
        title: 'Compliance Rule Updated',
        message: 'THC limit rule has been modified. 15 products affected.',
        type: 'success',
        time: '4:00 PM',
        date: 'Yesterday',
        read: true,
        category: 'Rules',
      },
      {
        id: '4',
        title: 'System Alert Resolved',
        message: 'Document verification service has been restored after scheduled maintenance.',
        type: 'success',
        time: '8:00 AM',
        date: 'Dec 28, 2025',
        read: true,
        category: 'System',
      },
      {
        id: '5',
        title: 'High Volume Alert',
        message: '50 new products submitted for review in the last 24 hours.',
        type: 'info',
        time: '9:00 PM',
        date: 'Dec 27, 2025',
        read: true,
        category: 'Analytics',
      },
    ];
  }
  
  if (role === 'CONSUMER') {
    return [
      {
        id: '1',
        title: 'Product Alert',
        message: 'A product you viewed "Premium CBD Oil" has been updated with new lab results.',
        type: 'info',
        time: '2:00 PM',
        date: 'Today',
        read: false,
        category: 'Products',
      },
      {
        id: '2',
        title: 'New Verified Products',
        message: '12 new verified products are available in your area.',
        type: 'success',
        time: '10:00 AM',
        date: 'Yesterday',
        read: true,
        category: 'Products',
      },
      {
        id: '3',
        title: 'Compliance Update',
        message: 'The compliance status of "Hemp Extract Gummies" has changed to Compliant.',
        type: 'success',
        time: '3:30 PM',
        date: 'Dec 28, 2025',
        read: true,
        category: 'Compliance',
      },
    ];
  }
  
  return baseNotifications;
};

function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
}) {
  const typeIcons: Record<string, keyof typeof Icons> = {
    success: 'check',
    warning: 'alert',
    error: 'xCircle',
    info: 'info',
  };

  const typeColors: Record<string, string> = {
    success: 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-100 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    error: 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400',
    info: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  };

  const IconComponent = Icons[typeIcons[notification.type]];

  return (
    <div
      className={`p-4 border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors ${
        !notification.read ? 'bg-primary-50/50 dark:bg-primary-900/5' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${typeColors[notification.type]}`}>
          <IconComponent size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`font-medium ${!notification.read ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}`}>
                {notification.title}
              </h3>
              <p className="text-sm text-[var(--foreground-muted)] mt-1">
                {notification.message}
              </p>
            </div>
            {!notification.read && (
              <button
                onClick={onMarkAsRead}
                className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap"
              >
                Mark as read
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-[var(--foreground-muted)]">
              {notification.date} at {notification.time}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--foreground-muted)]">
              {notification.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(
    getMockNotifications(user?.role)
  );
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = notification.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description="View and manage your notifications"
        actions={
          unreadCount > 0 ? (
            <button onClick={markAllAsRead} className="btn btn-secondary">
              <Icons.check className="mr-2" size={16} />
              Mark all as read
            </button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-[var(--foreground-muted)] hover:bg-[var(--background)]'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'unread'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-[var(--foreground-muted)] hover:bg-[var(--background)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        {filteredNotifications.length > 0 ? (
          Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <div className="px-4 py-2 bg-[var(--background)] border-b border-[var(--border)]">
                <span className="text-sm font-medium text-[var(--foreground-muted)]">
                  {date}
                </span>
              </div>
              {items.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <Icons.bell size={48} className="text-[var(--foreground-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-[var(--foreground-muted)]">
              {filter === 'unread'
                ? "You're all caught up!"
                : 'Notifications will appear here when you have them.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
