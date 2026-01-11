'use client';

import { ReactNode } from 'react';
import { Inbox, Search, AlertCircle, FileX, Users } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Pre-configured empty states
export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search or filters.`}
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
    />
  );
}

export function NoData({ entity = 'items', onCreate }: { entity?: string; onCreate?: () => void }) {
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8" />}
      title={`No ${entity} yet`}
      description={`There are no ${entity} to display. They will appear here once created.`}
      action={onCreate ? { label: `Create ${entity}`, onClick: onCreate } : undefined}
    />
  );
}

export function NoDocuments({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={<FileX className="h-8 w-8" />}
      title="No documents"
      description="No documents have been uploaded for review yet."
      action={onUpload ? { label: 'Upload document', onClick: onUpload } : undefined}
    />
  );
}

export function NoUsers({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title="No users"
      description="No admin users found. Invite team members to get started."
      action={onInvite ? { label: 'Invite user', onClick: onInvite } : undefined}
    />
  );
}

export function ErrorState({ 
  title = 'Something went wrong', 
  description, 
  onRetry 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-8 w-8 text-red-400" />}
      title={title}
      description={description || "We couldn't load this content. Please try again."}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}
