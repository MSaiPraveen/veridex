'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input, Select, FormRow, FormActions } from '@/components/ui/form';
import { User } from '@/lib/hooks';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UserUpdateInput) => Promise<void>;
  user: User;
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  role?: User['role'];
  status?: User['status'];
}

const ROLES = [
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'MERCHANT', label: 'Merchant' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'LOCKED', label: 'Locked' },
];

export function UserForm({ isOpen, onClose, onSubmit, user }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<User['role']>('CONSUMER');
  const [status, setStatus] = useState<User['status']>('ACTIVE');

  // Reset form when user changes
  useEffect(() => {
    if (user) {
       
      setFirstName(user.firstName || '');
       
      setLastName(user.lastName || '');
       
      setRole(user.role);
       
      setStatus(user.status);
    }
     
    setErrors({});
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const data: UserUpdateInput = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role,
        status,
      };

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only Email */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            Email
          </label>
          <div className="input bg-[var(--background)] cursor-not-allowed opacity-70">
            {user.email}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">
            Email cannot be changed
          </p>
        </div>

        <FormRow cols={2}>
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            error={errors.firstName}
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            error={errors.lastName}
          />
        </FormRow>

        <FormRow cols={2}>
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as User['role'])}
            options={ROLES}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as User['status'])}
            options={STATUSES}
          />
        </FormRow>

        {/* Organization Info */}
        {user.organizationId && (
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Organization ID
            </label>
            <div className="input bg-[var(--background)] cursor-not-allowed opacity-70 font-mono text-sm">
              {user.organizationId}
            </div>
          </div>
        )}

        {/* User Meta */}
        <div className="pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--foreground-muted)]">
            User created: {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        <FormActions
          onCancel={onClose}
          submitLabel="Update User"
          isSubmitting={isSubmitting}
        />
      </form>
    </Modal>
  );
}
