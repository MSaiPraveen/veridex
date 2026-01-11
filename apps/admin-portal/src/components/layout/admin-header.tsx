'use client';

import { User, LogOut, Settings, ChevronDown, Moon, Sun, Menu, Monitor } from 'lucide-react';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { useTheme } from '@/components/providers/theme-provider';
import { Dropdown, DropdownItem, DropdownDivider, DropdownHeader } from '@/components/ui/dropdown';
import { Avatar } from '@/components/ui/avatar';
import { GlobalSearch } from '@/components/ui/global-search';
import { NotificationBell } from '@/components/ui/notifications-center';
import { Tooltip } from '@/components/ui/tooltip';
import { ROLE_DISPLAY_INFO, AdminRole } from '@/lib/admin-rbac';
import Link from 'next/link';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth();
  const { theme, setTheme, resolvedTheme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  // Get role display info
  const roleInfo = user?.role ? ROLE_DISPLAY_INFO[user.role as AdminRole] : null;

  return (
    <header className="sticky top-0 z-header h-16 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700/50">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Environment badge */}
          <div className="hidden sm:flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide">
              INTERNAL
            </span>
          </div>

          {/* Global Search */}
          <GlobalSearch />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Tooltip content={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </Tooltip>

          {/* Notifications */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-3 p-1.5 pr-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                <Avatar
                  name={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'Admin'}
                  size="sm"
                  className="ring-2 ring-amber-500/50"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                  </p>
                  {roleInfo && (
                    <p className={`text-xs mt-0.5 ${roleInfo.colorClass}`}>
                      {roleInfo.label}
                    </p>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            }
            align="end"
          >
            <DropdownHeader>
              <p className="text-sm font-medium text-white">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin User'}
              </p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </DropdownHeader>
            <DropdownItem 
              icon={<User className="h-4 w-4" />}
              onClick={() => {}}
            >
              <Link href="/settings">My Profile</Link>
            </DropdownItem>
            <DropdownDivider />
            {/* Theme Submenu */}
            <div className="px-3 py-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Theme</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    theme === 'light' 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    theme === 'system' 
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Auto
                </button>
              </div>
            </div>
            <DropdownDivider />
            <DropdownItem
              icon={<Settings className="h-4 w-4" />}
              onClick={() => {}}
            >
              <Link href="/settings">Settings</Link>
            </DropdownItem>
            <DropdownItem
              icon={<LogOut className="h-4 w-4" />}
              onClick={handleLogout}
              variant="danger"
            >
              Sign out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
