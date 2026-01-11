'use client';

import { Icons } from '@/components/ui/icons';
import { ProductScope } from './types';

interface ScopeTabsProps {
  activeTab: ProductScope;
  onTabChange: (tab: ProductScope) => void;
  orgProductCount?: number;
  globalProductCount?: number;
}

export function ScopeTabs({
  activeTab,
  onTabChange,
  orgProductCount,
  globalProductCount,
}: ScopeTabsProps) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)]">
        <nav className="flex" role="tablist">
          <TabButton
            active={activeTab === 'organization'}
            onClick={() => onTabChange('organization')}
            icon={<Icons.package size={18} />}
            title="Your Organization"
            subtitle="Products owned by your organization"
            count={orgProductCount}
            badge={null}
          />
          <TabButton
            active={activeTab === 'global'}
            onClick={() => onTabChange('global')}
            icon={<Icons.globe size={18} />}
            title="Global Catalog"
            subtitle="Browse & import shared products"
            count={globalProductCount}
            badge={
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                READ-ONLY
              </span>
            }
          />
        </nav>
      </div>

      {/* Scope Info Banner */}
      {activeTab === 'global' && (
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100 dark:border-blue-900/40">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Icons.info size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Global Catalog - Read Only
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Browse shared products and click <strong>"Import"</strong> to add a copy to your organization with optional customizations.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'organization' && (
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <Icons.shield size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                <strong>Your products</strong> — Full edit access with compliance tracking
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Multi-tenant isolated
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  count?: number;
  badge: React.ReactNode;
}

function TabButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
  count,
  badge,
}: TabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        relative flex-1 px-6 py-4 text-left transition-all duration-200
        ${active
          ? 'bg-gradient-to-b from-primary-50/80 to-transparent dark:from-primary-900/20 dark:to-transparent'
          : 'hover:bg-[var(--muted)]/50'
        }
      `}
    >
      {/* Active indicator */}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-primary-600" />
      )}

      <div className="flex items-start gap-3">
        <div className={`
          flex-shrink-0 p-2 rounded-lg transition-colors
          ${active
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
            : 'bg-[var(--muted)] text-[var(--foreground-muted)]'
          }
        `}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`
              text-sm font-semibold truncate
              ${active ? 'text-primary-700 dark:text-primary-300' : 'text-[var(--foreground)]'}
            `}>
              {title}
            </span>
            {count !== undefined && (
              <span className={`
                px-2 py-0.5 text-xs font-medium rounded-full
                ${active
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'bg-[var(--muted)] text-[var(--foreground-muted)]'
                }
              `}>
                {count.toLocaleString()}
              </span>
            )}
            {badge}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5 truncate">
            {subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
