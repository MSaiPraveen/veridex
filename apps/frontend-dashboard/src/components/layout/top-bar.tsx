"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/lib/auth-context";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  time: string;
  read: boolean;
}

// Role-based notifications
const getNotificationsForRole = (role?: string): Notification[] => {
  if (role === 'MERCHANT') {
    return [
      {
        id: "1",
        title: "Document Approved",
        message: "Your business license has been approved",
        type: "success",
        time: "2 hours ago",
        read: false,
      },
      {
        id: "2",
        title: "Compliance Review",
        message: "A new compliance review has been requested",
        type: "warning",
        time: "5 hours ago",
        read: false,
      },
      {
        id: "3",
        title: "Product Update",
        message: "Your product listing has been updated",
        type: "info",
        time: "1 day ago",
        read: true,
      },
    ];
  }
  
  if (role === 'CONSUMER') {
    return [
      {
        id: "1",
        title: "Product Alert",
        message: "A product you viewed has been updated",
        type: "info",
        time: "1 hour ago",
        read: false,
      },
      {
        id: "2",
        title: "Compliance Update",
        message: "New verified products are available",
        type: "success",
        time: "1 day ago",
        read: true,
      },
    ];
  }
  
  return [];
};

type OpenDropdown = 'none' | 'search' | 'notifications' | 'profile';

export function TopBar({
  onMenuClick,
  showMenuButton,
}: {
  onMenuClick: () => void;
  showMenuButton: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>('none');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mounted, setMounted] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (user?.role) {
      setNotifications(getNotificationsForRole(user.role));
    }
  }, [user?.role]);

  const toggleDropdown = useCallback((dropdown: OpenDropdown) => {
    setOpenDropdown(current => current === dropdown ? 'none' : dropdown);
  }, []);

  const closeAll = useCallback(() => setOpenDropdown('none'), []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !searchRef.current?.contains(target) &&
        !notificationRef.current?.contains(target) &&
        !profileRef.current?.contains(target)
      ) {
        closeAll();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [closeAll]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAll();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeAll]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const basePath = user?.role === 'CONSUMER' ? '/consumer' : user?.role === 'MERCHANT' ? '/merchant' : '';
      router.push(`${basePath}/products?search=${encodeURIComponent(searchQuery.trim())}`);
      closeAll();
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    closeAll();
    await logout();
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || "User";
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const iconClass = {
      success: "text-emerald-500",
      warning: "text-amber-500",
      error: "text-red-500",
      info: "text-blue-500",
    }[type];
    
    const IconComponent = {
      success: Icons.check,
      warning: Icons.alertCircle,
      error: Icons.x,
      info: Icons.info,
    }[type];
    
    return <IconComponent size={16} className={iconClass} />;
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--card-bg)] border-b border-[var(--border)]">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Logo & Menu */}
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <Icons.menu className="text-[var(--foreground-muted)]" size={20} />
            </button>
          )}

          <Link href="/" className="flex items-center gap-3">
            <Icons.logo size={32} />
            <span className="text-xl font-semibold text-[var(--foreground)] hidden sm:block">
              Veridex
            </span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
          <form onSubmit={handleSearch} className="relative w-full">
            <Icons.search 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" 
              size={18} 
            />
            <input
              type="text"
              placeholder="Search products, check compliance..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--muted)] border-0 rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile Search */}
          <button className="md:hidden p-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors">
            <Icons.search className="text-[var(--foreground-muted)]" size={20} />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => toggleDropdown('notifications')}
              className={`relative p-2.5 rounded-xl transition-colors ${
                openDropdown === 'notifications' 
                  ? 'bg-[var(--muted)]' 
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              <Icons.bell className="text-[var(--foreground-muted)]" size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {openDropdown === 'notifications' && mounted && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-xl z-[9999] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--foreground)]">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto bg-[var(--card-bg)]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Icons.bell className="mx-auto text-[var(--foreground-muted)] mb-2" size={32} />
                      <p className="text-sm text-[var(--foreground-muted)]">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--muted)] ${
                          !n.read ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium text-[var(--foreground)]`}>
                                {n.title}
                              </p>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />}
                            </div>
                            <p className="text-xs text-[var(--foreground-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-[var(--foreground-muted)] mt-1 uppercase tracking-wide">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-[var(--border)] bg-[var(--card-bg)]">
                  <Link
                    href="/notifications"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-[var(--muted)] transition-colors"
                  >
                    View all notifications
                    <Icons.chevronRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors"
          >
            {theme === "light" ? (
              <Icons.moon className="text-[var(--foreground-muted)]" size={20} />
            ) : (
              <Icons.sun className="text-[var(--foreground-muted)]" size={20} />
            )}
          </button>

          {/* Profile */}
          <div className="relative ml-1" ref={profileRef}>
            <button
              onClick={() => toggleDropdown('profile')}
              className={`flex items-center gap-2 p-1.5 rounded-xl transition-colors ${
                openDropdown === 'profile' 
                  ? 'bg-[var(--muted)]' 
                  : 'hover:bg-[var(--muted)]'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                <span className="text-sm font-medium text-white">{getInitials()}</span>
              </div>
              <Icons.chevronDown 
                className={`hidden sm:block text-slate-400 transition-transform duration-200 ${
                  openDropdown === 'profile' ? 'rotate-180' : ''
                }`} 
                size={14} 
              />
            </button>

            {/* Profile Dropdown */}
            {openDropdown === 'profile' && mounted && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-xl z-[9999] overflow-hidden">
                {/* User Info */}
                <div className="p-4 bg-[var(--muted)]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <span className="text-base font-semibold text-white">{getInitials()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--foreground)] truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)] truncate">{user?.email}</p>
                      <span className="inline-flex items-center mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 uppercase">
                        {user?.role?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2 bg-[var(--card-bg)]">
                  <Link
                    href="/profile"
                    onClick={closeAll}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                      <Icons.user size={18} className="text-[var(--foreground-muted)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">My Profile</p>
                      <p className="text-xs text-[var(--foreground-muted)]">View and edit profile</p>
                    </div>
                  </Link>
                  
                  <Link
                    href="/settings"
                    onClick={closeAll}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                      <Icons.settings size={18} className="text-[var(--foreground-muted)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Settings</p>
                      <p className="text-xs text-[var(--foreground-muted)]">Preferences & security</p>
                    </div>
                  </Link>

                  {user?.organizationId && (
                    <Link
                      href="/organization"
                      onClick={closeAll}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--muted)] flex items-center justify-center">
                        <Icons.building size={18} className="text-[var(--foreground-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Organization</p>
                        <p className="text-xs text-[var(--foreground-muted)]">Manage your org</p>
                      </div>
                    </Link>
                  )}
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-[var(--border)] bg-[var(--card-bg)]">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Icons.logout size={18} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Sign Out</p>
                      <p className="text-xs text-red-500/70">End your session</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
