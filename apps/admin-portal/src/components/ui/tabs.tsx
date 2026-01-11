'use client';

import { ReactNode, createContext, useContext } from 'react';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`border-b border-slate-200 dark:border-slate-700/50 ${className}`}>
        <nav className="-mb-px flex gap-6 overflow-x-auto" role="tablist">
          {children}
        </nav>
      </div>
    </TabsContext.Provider>
  );
}

interface TabProps {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export function Tab({ value, label, icon, count, disabled = false }: TabProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('Tab must be used within a Tabs component');
  }
  
  const isActive = context.value === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && context.onChange(value)}
      className={`
        group relative flex items-center gap-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors
        ${isActive 
          ? 'text-amber-500' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`
          ml-1 px-2 py-0.5 rounded-full text-xs font-semibold
          ${isActive 
            ? 'bg-amber-500/10 text-amber-500' 
            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
          }
        `}>
          {count}
        </span>
      )}
      {/* Active indicator */}
      <span className={`
        absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full transition-colors
        ${isActive ? 'bg-amber-500' : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}
      `} />
    </button>
  );
}

interface TabPanelProps {
  value: string;
  activeValue: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, activeValue, children, className = '' }: TabPanelProps) {
  if (value !== activeValue) return null;
  
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}

// Vertical tabs variant
interface VerticalTabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function VerticalTabs({ value, onChange, children, className = '' }: VerticalTabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`flex flex-col gap-1 ${className}`} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function VerticalTab({ value, label, icon, count, disabled = false }: TabProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('VerticalTab must be used within a VerticalTabs component');
  }
  
  const isActive = context.value === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && context.onChange(value)}
      className={`
        flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${isActive 
          ? 'bg-amber-500/10 text-amber-500' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-semibold
          ${isActive 
            ? 'bg-amber-500/20 text-amber-500' 
            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
          }
        `}>
          {count}
        </span>
      )}
    </button>
  );
}
