'use client';

/**
 * Interactive Dashboard Components
 * These are the ONLY client components for the dashboard
 * All data is passed as props from the server
 */

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';

// ============================================
// Action Button with Dropdown
// ============================================
interface ActionMenuProps {
  items: { label: string; href: string }[];
}

export function ActionMenu({ items }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Live Clock (only interactive element that needs client)
// ============================================
export function LiveClock() {
  const [time, setTime] = useState(new Date());

  // Update every minute
  if (typeof window !== 'undefined') {
    setTimeout(() => setTime(new Date()), 60000);
  }

  return (
    <span className="text-sm text-slate-500 dark:text-slate-400">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

// ============================================
// Expandable Alert Card
// ============================================
interface ExpandableAlertProps {
  id: number;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  slaRemaining: string | null;
  count: number;
}

export function ExpandableAlert({ id, type, title, slaRemaining, count }: ExpandableAlertProps) {
  return (
    <Link href="/alerts" className="block">
      <div className={`p-4 rounded-xl border-l-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
        type === 'CRITICAL' ? 'bg-red-50 dark:bg-red-500/10 border-red-500' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-500'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Static SVG instead of lucide icon */}
            <svg className={`h-5 w-5 flex-shrink-0 mt-0.5 ${type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  type === 'CRITICAL' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  {type}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{count} items</span>
              </div>
            </div>
          </div>
          {slaRemaining && (
            <div className="flex items-center gap-1 text-sm">
              {/* Timer icon as static SVG */}
              <svg className={`h-4 w-4 ${type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400'}>
                {slaRemaining}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
