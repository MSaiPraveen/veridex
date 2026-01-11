'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  FileText,
  Settings,
  ScrollText,
  Building2,
  Package,
  BookOpen,
  Boxes,
  UserCog,
  X,
  ChevronRight,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Scale,
  History,
  Activity,
  Store,
  AlertOctagon,
  TrendingUp,
  FileOutput,
  Server
} from 'lucide-react';
import { ADMIN_NAVIGATION, ROLE_DISPLAY_INFO, AdminRole } from '@/lib/admin-rbac';
import { useAdminPermissions } from '@/components/auth/permission-gate';

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  'LayoutDashboard': <LayoutDashboard className="h-5 w-5" />,
  'Building2': <Building2 className="h-5 w-5" />,
  'FileText': <FileText className="h-5 w-5" />,
  'Shield': <Shield className="h-5 w-5" />,
  'ShieldCheck': <ShieldCheck className="h-5 w-5" />,
  'ShieldAlert': <ShieldAlert className="h-5 w-5" />,
  'Package': <Package className="h-5 w-5" />,
  'Boxes': <Boxes className="h-5 w-5" />,
  'BookOpen': <BookOpen className="h-5 w-5" />,
  'ScrollText': <ScrollText className="h-5 w-5" />,
  'UserCog': <UserCog className="h-5 w-5" />,
  'Settings': <Settings className="h-5 w-5" />,
  'ClipboardCheck': <ClipboardCheck className="h-5 w-5" />,
  'AlertTriangle': <AlertTriangle className="h-5 w-5" />,
  'Scale': <Scale className="h-5 w-5" />,
  'History': <History className="h-5 w-5" />,
  'Activity': <Activity className="h-5 w-5" />,
  'Store': <Store className="h-5 w-5" />,
  'AlertOctagon': <AlertOctagon className="h-5 w-5" />,
  'TrendingUp': <TrendingUp className="h-5 w-5" />,
  'FileOutput': <FileOutput className="h-5 w-5" />,
  'Server': <Server className="h-5 w-5" />,
};

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { role } = useAdminPermissions();

  // Show all navigation items for any admin user
  const visibleNavItems = ADMIN_NAVIGATION;

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 
          bg-white dark:bg-slate-950 
          border-r border-slate-200 dark:border-slate-800
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              Veridex <span className="text-amber-500">Admin</span>
            </span>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {visibleNavItems.map((item) => {
              const active = isActive(item.href);
              const icon = iconMap[item.icon] || <LayoutDashboard className="h-5 w-5" />;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-colors duration-150
                    ${active
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <span className={active ? 'text-amber-500' : ''}>
                    {icon}
                  </span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                      !
                    </span>
                  )}
                  {item.children && item.children.length > 0 && (
                    <ChevronRight className="ml-auto h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Role Badge */}
        {role && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="px-3 py-2 rounded-lg text-center text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Administrator
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
