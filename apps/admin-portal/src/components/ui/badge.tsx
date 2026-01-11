'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'error' | 'info' | 'amber' | 'purple';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-700/50 text-slate-300 ring-slate-600/50',
  success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
  error: 'bg-red-500/10 text-red-400 ring-red-500/20',
  info: 'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  amber: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
  purple: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  error: 'bg-red-400',
  info: 'bg-sky-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm', 
  dot = false,
  className = '' 
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full ring-1 ring-inset
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

// Role-specific badge for admin portal - simplified to single ADMIN role
type AdminRoleType = 'ADMIN';

const roleStyles: Record<AdminRoleType, { bg: string; text: string; label: string }> = {
  ADMIN: { 
    bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20', 
    text: 'text-amber-300',
    label: 'Admin'
  },
};

export function RoleBadge({ role, size = 'sm' }: { role: string; size?: BadgeSize }) {
  const style = roleStyles[role as AdminRoleType] || roleStyles.ADMIN;
  
  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-md ring-1 ring-white/10
        ${style.bg} ${style.text}
        ${sizeClasses[size]}
      `}
    >
      {style.label}
    </span>
  );
}

// Status badge for compliance/document states
export type StatusType = 'pending' | 'approved' | 'rejected' | 'under_review' | 'compliant' | 'non_compliant' | 'active' | 'suspended' | 'expired' | 'success' | 'warning' | 'error' | 'info';

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
  under_review: { variant: 'info', label: 'Under Review' },
  compliant: { variant: 'success', label: 'Compliant' },
  non_compliant: { variant: 'danger', label: 'Non-Compliant' },
  active: { variant: 'success', label: 'Active' },
  suspended: { variant: 'danger', label: 'Suspended' },
  expired: { variant: 'warning', label: 'Expired' },
  success: { variant: 'success', label: 'Success' },
  warning: { variant: 'warning', label: 'Warning' },
  error: { variant: 'danger', label: 'Error' },
  info: { variant: 'info', label: 'Info' },
};

export function StatusBadge({ status, size = 'sm', label }: { status: StatusType; size?: BadgeSize; label?: string }) {
  const config = statusConfig[status] || { variant: 'default' as BadgeVariant, label: status };
  
  return (
    <Badge variant={config.variant} size={size} dot>
      {label || config.label}
    </Badge>
  );
}
