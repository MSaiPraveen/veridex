'use client';

/**
 * Admin Layout Client Component
 * 
 * This is the ONLY client component in the layout chain.
 * It handles:
 * - Mobile sidebar toggle state
 * - Auth state checking (without blocking render)
 * - Theme mounting check
 * - Search bar functionality
 * - Notification center
 * 
 * IMPORTANT: This component should NOT show skeleton during normal navigation.
 * Skeleton is only shown on initial load before auth is determined.
 */

import { useState, useCallback, memo, useEffect } from 'react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { DropdownManager } from '@/components/ui/dropdown';
import { useTheme } from '@/components/providers/theme-provider';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

// ============================================
// STATIC NAVIGATION CONFIGURATION
// ============================================

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { label: 'Review Queue', href: '/review-queue', icon: 'clipboard' },
  { label: 'Compliance Queue', href: '/compliance-queue', icon: 'shield' },
  { label: 'Alerts', href: '/alerts', icon: 'alert' },
  { label: 'Merchants', href: '/merchants', icon: 'store' },
  { label: 'Products', href: '/products', icon: 'package' },
  { label: 'Documents', href: '/documents', icon: 'file' },
  { label: 'Rule Governance', href: '/rule-governance', icon: 'scale' },
  { label: 'Audit Logs', href: '/audit-logs', icon: 'eye' },
  { label: 'Admin Users', href: '/admin-users', icon: 'users' },
  { label: 'System Health', href: '/system-health', icon: 'activity' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

// ============================================
// INLINE SVG ICONS (No external imports)
// ============================================

const NavIcon = memo(function NavIcon({ name, className }: { name: string; className?: string }) {
  const cls = className || 'h-5 w-5';
  
  switch (name) {
    case 'dashboard':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
    case 'clipboard':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'shield':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
    case 'alert':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;
    case 'store':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>;
    case 'package':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
    case 'file':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
    case 'scale':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971z" /></svg>;
    case 'eye':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'users':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
    case 'activity':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
    case 'settings':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'search':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
    case 'bell':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
    case 'logout':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" /></svg>;
  }
});

// ============================================
// MEMOIZED COMPONENTS
// ============================================

// Memoized Nav Item
const NavItem = memo(function NavItem({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: typeof NAV_ITEMS[0]; 
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-all duration-150 no-underline
        ${isActive
          ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 shadow-sm border-l-2 border-amber-500'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'
        }
      `}
      style={{ textDecoration: 'none' }}
    >
      <span className={isActive ? 'text-amber-500' : ''}>
        <NavIcon name={item.icon} />
      </span>
      <span className="font-medium text-sm" style={{ textDecoration: 'none' }}>{item.label}</span>
    </Link>
  );
});

// Search Bar Component
const SearchBar = memo(function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative hidden md:block">
      <div className="relative">
        <NavIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchants, products..."
          className="w-64 lg:w-80 pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-amber-500 dark:focus:border-amber-500 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
        />
      </div>
    </form>
  );
});

// Notification Bell Component
const NotificationBell = memo(function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'Document pending review', time: '5 min ago', unread: true },
    { id: 2, title: 'Compliance alert: CBD Oil 500mg', time: '1 hour ago', unread: true },
    { id: 3, title: 'New merchant registration', time: '2 hours ago', unread: false },
  ]);
  
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        aria-label="Notifications"
      >
        <NavIcon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${notification.unread ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {notification.unread && (
                      <span className="mt-1.5 h-2 w-2 bg-amber-500 rounded-full flex-shrink-0" />
                    )}
                    <div className={notification.unread ? '' : 'ml-5'}>
                      <p className="text-sm text-slate-900 dark:text-white">{notification.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notification.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <Link 
                href="/alerts" 
                className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium"
                onClick={() => setIsOpen(false)}
              >
                View all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// Header Component with Search and Notifications
const Header = memo(function Header({ 
  onMenuClick, 
  userName,
  userEmail,
  onLogout
}: { 
  onMenuClick: () => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left side - Mobile menu + Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Search bar */}
          <SearchBar />
        </div>

        {/* Right side - Environment badge, notifications, theme, user */}
        <div className="flex items-center gap-2">
          {/* Environment badge */}
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide">
            INTERNAL
          </span>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-3 ml-1 border-l border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-amber-500/25">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                  {userName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {userEmail}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <NavIcon name="settings" className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <NavIcon name="logout" className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

// Initial Loading Skeleton (only shown on first load)
function InitialLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden lg:block">
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center">
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)] p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================
// MAIN LAYOUT COMPONENT
// ============================================

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const pathname = usePathname();
  const { isLoading, user, logout } = useAdminAuth();
  const { mounted } = useTheme();

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  // Track when component has mounted on client to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Always render the same structure on server and initial client render
  // to avoid hydration mismatch. Only after mount do we check auth state.
  if (!hasMounted) {
    // Return null or a minimal shell during SSR to avoid mismatch
    // The actual content will render immediately after hydration
    return null;
  }

  // Show loading skeleton only during actual loading state after mount
  if (isLoading || !mounted) {
    return <InitialLoadingSkeleton />;
  }

  // If user is null after initialization, the auth context will redirect
  // Don't block rendering here - show the layout
  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin';
  const userEmail = user?.email || '';

  return (
    <DropdownManager>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-0 left-0 z-50 h-full w-64 
            bg-white dark:bg-slate-900 
            border-r border-slate-200 dark:border-slate-800
            transition-transform duration-300 ease-in-out
            lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                Veridex <span className="text-amber-500">Admin</span>
              </span>
            </Link>
            
            {/* Mobile close button */}
            <button
              onClick={closeSidebar}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              aria-label="Close sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  onClick={closeSidebar}
                />
              ))}
            </div>
          </nav>

          {/* Role Badge */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="px-3 py-2 rounded-lg text-center text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Administrator
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <div className="lg:pl-64 min-h-screen flex flex-col">
          <Header 
            onMenuClick={openSidebar}
            userName={userName}
            userEmail={userEmail}
            onLogout={logout}
          />

          {/* Page content */}
          <main className="flex-1 min-h-[calc(100vh-64px)]">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DropdownManager>
  );
}
