'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock,
  Shield,
  FileText,
  Users,
  Settings,
  Trash2,
  Archive,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'compliance' | 'system' | 'user' | 'security';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const typeConfig: Record<string, { icon: typeof Shield; color: string }> = {
  compliance: { icon: Shield, color: 'text-amber-400' },
  system: { icon: Settings, color: 'text-blue-400' },
  user: { icon: Users, color: 'text-purple-400' },
  security: { icon: AlertTriangle, color: 'text-red-400' },
};

const severityConfig: Record<string, { bg: string; border: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle },
};

// Mock notifications - replace with real API
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'compliance',
    severity: 'critical',
    title: 'Critical: Compliance Violation Detected',
    message: 'Product batch #4521 from GreenLeaf Labs has failed THC limit compliance check. Immediate review required.',
    timestamp: '5 minutes ago',
    read: false,
    actionUrl: '/compliance-queue',
    actionLabel: 'Review Now'
  },
  {
    id: '2',
    type: 'compliance',
    severity: 'warning',
    title: 'COA Expiring Soon',
    message: '3 certificates of analysis will expire within 7 days. Schedule renewal with vendors.',
    timestamp: '1 hour ago',
    read: false,
    actionUrl: '/documents?filter=expiring',
    actionLabel: 'View Documents'
  },
  {
    id: '3',
    type: 'user',
    severity: 'info',
    title: 'New Merchant Registration',
    message: 'Pure Wellness Co has completed registration and is awaiting verification.',
    timestamp: '2 hours ago',
    read: false,
    actionUrl: '/organizations/org-new',
    actionLabel: 'Review Application'
  },
  {
    id: '4',
    type: 'system',
    severity: 'success',
    title: 'System Update Complete',
    message: 'Compliance rules engine v2.4.1 has been deployed successfully.',
    timestamp: '4 hours ago',
    read: true,
  },
  {
    id: '5',
    type: 'security',
    severity: 'warning',
    title: 'Unusual Login Activity',
    message: 'Multiple failed login attempts detected for admin account mike.admin@veridex.io',
    timestamp: '6 hours ago',
    read: true,
    actionUrl: '/audit-logs?type=AUTH',
    actionLabel: 'View Logs'
  },
  {
    id: '6',
    type: 'compliance',
    severity: 'info',
    title: 'Weekly Compliance Report Ready',
    message: 'The weekly compliance summary for Dec 26 - Jan 1 is now available for review.',
    timestamp: '1 day ago',
    read: true,
    actionUrl: '/reports/weekly',
    actionLabel: 'View Report'
  },
];

interface NotificationsCenterProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function NotificationsCenter({ isOpen, onClose, anchorEl }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && 
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorEl]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200]">
      {/* Backdrop - transparent */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Notification Panel */}
      <div
        ref={panelRef}
        className="absolute top-16 right-4 sm:right-8 w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-down"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-400" />
            <h2 className="font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-700/30">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'unread'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <div className="flex-1" />
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No notifications</p>
              <p className="text-sm text-slate-500 mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {filteredNotifications.map((notification) => {
                const typeConf = typeConfig[notification.type];
                const sevConf = severityConfig[notification.severity];
                const TypeIcon = typeConf.icon;
                const SevIcon = sevConf.icon;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-slate-700/20 transition-colors ${
                      !notification.read ? 'bg-slate-700/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 p-2 rounded-lg ${sevConf.bg}`}>
                        <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium text-white flex-1">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 h-2 w-2 mt-1.5 bg-amber-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {notification.timestamp}
                          </span>
                          {notification.actionUrl && (
                            <Link
                              href={notification.actionUrl}
                              onClick={() => {
                                markAsRead(notification.id);
                                onClose();
                              }}
                              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              {notification.actionLabel}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/50">
          <Link
            href="/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            View all notifications
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Mock unread count - replace with real API
  const unreadCount = 3;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
            <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      <NotificationsCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorEl={buttonRef.current}
      />
    </>
  );
}
