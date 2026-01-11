"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Icons } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth-context";
import { api, ApiResponse } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  createdAt?: string;
  lastLogin?: string;
  permissions?: string[];
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.patch<ApiResponse<UserProfile>>("/users/me", {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      
      await refreshUser();
      setSuccess("Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || "User";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="My Profile"
        description="View and manage your account information"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-white">{getUserInitials()}</span>
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {getUserDisplayName()}
            </h2>
            <p className="text-[var(--foreground-muted)] mt-1">{user?.email}</p>
            <span className="inline-block mt-3 px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
              {user?.role?.replace("_", " ")}
            </span>

            {user?.organizationId && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-center gap-2 text-[var(--foreground-muted)]">
                  <Icons.building size={16} />
                  <span className="text-sm">Organization Member</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card p-6 mt-6">
            <h3 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-4">
              Account Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
                  <Icons.user className="text-primary-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">User ID</p>
                  <p className="text-sm font-mono text-[var(--foreground)]">{user?.id?.slice(0, 12)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
                  <Icons.shield className="text-success-600" size={20} />
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Role</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert Messages */}
          {error && (
            <div className="p-4 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
              <div className="flex items-center gap-3">
                <Icons.xCircle className="text-error-500" size={20} />
                <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
              <div className="flex items-center gap-3">
                <Icons.checkCircle className="text-success-500" size={20} />
                <p className="text-sm text-success-700 dark:text-success-400">{success}</p>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Personal Information</h3>
                <p className="text-sm text-[var(--foreground-muted)]">Update your personal details</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Icons.edit size={16} />
                  Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="text-[var(--foreground-muted)] py-2">
                      {user?.firstName || "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="text-[var(--foreground-muted)] py-2">
                      {user?.lastName || "Not set"}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Email Address
                  </label>
                  <p className="text-[var(--foreground-muted)] py-2 flex items-center gap-2">
                    <Icons.mail size={16} />
                    {user?.email}
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--background)] text-[var(--foreground-muted)]">
                      Cannot be changed
                    </span>
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--border)]">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Icons.check size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        firstName: user?.firstName || "",
                        lastName: user?.lastName || "",
                        email: user?.email || "",
                      });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security Settings */}
          <div className="card">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Security</h3>
              <p className="text-sm text-[var(--foreground-muted)]">Manage your password and security settings</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center">
                    <Icons.lock className="text-warning-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Password</p>
                    <p className="text-sm text-[var(--foreground-muted)]">Last changed: N/A</p>
                  </div>
                </div>
                <button className="btn-secondary flex items-center gap-2">
                  <Icons.edit size={16} />
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Permissions */}
          {user?.permissions && user.permissions.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Permissions</h3>
                <p className="text-sm text-[var(--foreground-muted)]">Your granted permissions in the system</p>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--background)] text-[var(--foreground-muted)] border border-[var(--border)]"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
