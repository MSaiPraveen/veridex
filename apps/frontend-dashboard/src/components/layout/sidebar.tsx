"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/ui/icons";
import { useAuth, User } from "@/lib/auth-context";

interface NavItem {
  label: string;
  href: string;
  icon: keyof typeof Icons;
}

interface NavSection {
  title: string;
  icon: keyof typeof Icons;
  items: NavItem[];
  roles: User['role'][];
}

const navigation: NavSection[] = [
  {
    title: "Consumer",
    icon: "users",
    roles: ['CONSUMER'],
    items: [
      { label: "Dashboard", href: "/consumer", icon: "home" },
      { label: "Products", href: "/consumer/products", icon: "package" },
      { label: "Compliance", href: "/consumer/compliance", icon: "clipboardCheck" },
    ],
  },
  {
    title: "Merchant",
    icon: "store",
    roles: ['MERCHANT'],
    items: [
      { label: "Dashboard", href: "/merchant", icon: "home" },
      { label: "Profile", href: "/merchant/profile", icon: "user" },
      { label: "Products", href: "/merchant/products", icon: "package" },
      { label: "Documents", href: "/merchant/documents", icon: "fileText" },
      { label: "Status", href: "/merchant/status", icon: "activity" },
    ],
  },
  {
    title: "Administration",
    icon: "shield",
    roles: ['ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: "Dashboard", href: "/admin", icon: "home" },
      { label: "Rules", href: "/admin/rules", icon: "settings" },
      { label: "Audits", href: "/admin/audits", icon: "clipboardList" },
      { label: "Reviews", href: "/admin/reviews", icon: "eye" },
    ],
  },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(
    section => user && section.roles.includes(user.role)
  );

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // Determine accent color based on role
  const getRoleAccent = () => {
    if (!user) return 'primary';
    switch (user.role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'amber';
      case 'MERCHANT':
        return 'emerald';
      default:
        return 'blue';
    }
  };

  const accent = getRoleAccent();

  return (
    <>
      {/* Mobile Overlay - uses overlay z-index */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
          style={{ zIndex: 'var(--z-overlay, 600)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar - uses sidebar z-index */}
      <aside
        className={`
          fixed top-16 left-0 h-[calc(100vh-4rem)] w-64
          bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ zIndex: isOpen ? 'var(--z-sidebar, 300)' : 0 }}
      >
        <div className="flex flex-col h-full p-4 pb-8 overflow-y-auto">
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
          >
            <Icons.close className="text-[var(--foreground-muted)]" />
          </button>

          {/* Role Badge */}
          {user && (
            <div className={`mb-4 px-3 py-2 rounded-lg bg-${accent}-500/10 border border-${accent}-500/20`}>
              <p className={`text-xs font-semibold text-${accent}-600 dark:text-${accent}-400 uppercase tracking-wider`}>
                {user.role.replace('_', ' ')} Portal
              </p>
            </div>
          )}

          {/* Navigation Sections */}
          <nav className="space-y-6 mt-2">
            {filteredNavigation.map((section) => {
              const SectionIcon = Icons[section.icon];
              return (
                <div key={section.title}>
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <SectionIcon className="text-[var(--foreground-muted)]" size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                      {section.title}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = Icons[item.icon];
                      const isActive = pathname === item.href ||
                        (item.href !== '/consumer' && item.href !== '/merchant' && item.href !== '/admin' && pathname.startsWith(item.href));
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`sidebar-item ${isActive ? "active" : ""}`}
                            onClick={onClose}
                          >
                            <ItemIcon size={18} />
                            <span className="ml-3">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto pt-6 border-t border-[var(--border)]">
            <button
              onClick={handleLogout}
              className="sidebar-item text-error-500 hover:text-error-600 w-full text-left"
            >
              <Icons.logout size={18} />
              <span className="ml-3">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
