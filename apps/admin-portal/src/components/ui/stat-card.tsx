'use client';

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type StatVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  /** Label for the stat (primary prop name) */
  label?: string;
  /** Alias for label */
  title?: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  variant?: StatVariant;
  className?: string;
}

const variantStyles: Record<StatVariant, { icon: string; border: string }> = {
  default: { icon: 'bg-amber-500/10 text-amber-400', border: '' },
  success: { icon: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' },
  warning: { icon: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' },
  error: { icon: 'bg-red-500/10 text-red-400', border: 'border-red-500/20' },
  info: { icon: 'bg-sky-500/10 text-sky-400', border: 'border-sky-500/20' },
};

export function StatCard({ label, title, value, change, icon, variant = 'default', className = '' }: StatCardProps) {
  const displayLabel = label || title || '';
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!change) return null;
    if (change.type === 'increase') return <TrendingUp className="h-4 w-4" />;
    if (change.type === 'decrease') return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!change) return '';
    if (change.type === 'increase') return 'text-emerald-400';
    if (change.type === 'decrease') return 'text-red-400';
    return 'text-slate-400';
  };

  return (
    <div className={`
      bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5
      hover:border-slate-600/50 transition-colors duration-150
      ${styles.border}
      ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-1">{displayLabel}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        {icon && (
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
            {icon}
          </div>
        )}
      </div>

      {change && (
        <div className={`flex items-center gap-1.5 mt-3 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="font-medium">
            {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
            {Math.abs(change.value)}%
          </span>
          {change.period && (
            <span className="text-slate-500">vs {change.period}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Mini stat for sidebar or compact views
interface MiniStatProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantColors = {
  default: 'text-slate-600 dark:text-slate-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
};

export function MiniStat({ label, value, variant = 'default' }: MiniStatProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${variantColors[variant]}`}>{value}</span>
    </div>
  );
}

// Stat with ring/progress indicator
interface RingStatProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: 'amber' | 'emerald' | 'red' | 'sky';
}

const ringColors = {
  amber: 'stroke-amber-500',
  emerald: 'stroke-emerald-500',
  red: 'stroke-red-500',
  sky: 'stroke-sky-500',
};

export function RingStat({ label, value, max, unit = '', color = 'amber' }: RingStatProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-700"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={ringColors[color]}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(percentage)}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400">
          {value}{unit} of {max}{unit}
        </p>
      </div>
    </div>
  );
}
