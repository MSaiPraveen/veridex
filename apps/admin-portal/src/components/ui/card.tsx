'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-slate-900 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm dark:shadow-none
        ${hover ? 'hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150 cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4 ${className}`}>
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-slate-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`pt-4 border-t border-slate-200 dark:border-slate-700 mt-4 flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
