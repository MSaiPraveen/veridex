"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Icons } from "@/components/ui/icons";
import { useAuditLogs, useAuditStats, AuditLog } from "@/lib/hooks";
import { withAuth } from "@/lib/auth-context";

function StatusBadge({ success }: { success: boolean }) {
  return (
    <span className={`badge ${success ? "badge-success" : "badge-error"}`}>
      {success ? "Success" : "Failed"}
    </span>
  );
}

function SeverityIndicator({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-error-500",
    HIGH: "bg-warning-500",
    MEDIUM: "bg-info-500",
    LOW: "bg-success-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[severity] || "bg-gray-400"}`} />
      <span className="text-sm capitalize text-[var(--foreground)]">
        {severity.toLowerCase()}
      </span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminAuditsPage() {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Initialize filters from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      // eslint-disable-next-line
      setFilters(prev => ({ ...prev, search }));
    }
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useAuditLogs({
    page: page.toString(),
    limit: "20",
    ...filters,
  });

  const { data: stats } = useAuditStats(30);

  const audits = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <DashboardLayout>
      <PageHeader
        title="Audit Log"
        description="Track and manage compliance audits across all entities"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Audits" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              <Icons.sync className="mr-2" size={16} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      {stats?.data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-[var(--foreground-muted)]">Total Events</p>
            <p className="text-2xl font-semibold text-[var(--foreground)]">
              {stats.data.total.toLocaleString()}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--foreground-muted)]">Success Rate</p>
            <p className="text-2xl font-semibold text-success-600">
              {stats.data.successRate}%
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--foreground-muted)]">By Action</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {stats.data.byAction.slice(0, 2).map((a: { _id: string; count: number }) => `${a._id}: ${a.count}`).join(", ")}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-[var(--foreground-muted)]">By Resource</p>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {stats.data.byResourceType.slice(0, 2).map((r: { _id: string; count: number }) => `${r._id}: ${r.count}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm text-[var(--foreground-muted)] mb-1 block">Action</label>
            <select
              className="input w-40"
              value={filters.action || ""}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--foreground-muted)] mb-1 block">Resource</label>
            <select
              className="input w-40"
              value={filters.resourceType || ""}
              onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
            >
              <option value="">All Resources</option>
              <option value="USER">User</option>
              <option value="PRODUCT">Product</option>
              <option value="DOCUMENT">Document</option>
              <option value="ORGANIZATION">Organization</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--foreground-muted)] mb-1 block">Severity</label>
            <select
              className="input w-40"
              value={filters.severity || ""}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div className="ml-auto">
            <label className="text-sm text-[var(--foreground-muted)] mb-1 block">&nbsp;</label>
            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto" />
            <p className="mt-4 text-[var(--foreground-muted)]">Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error-600">
            <Icons.alertTriangle size={32} className="mx-auto mb-2" />
            <p>Error loading audit logs: {error}</p>
          </div>
        ) : audits.length === 0 ? (
          <div className="p-8 text-center">
            <Icons.fileText size={32} className="mx-auto mb-2 text-[var(--foreground-muted)]" />
            <p className="text-[var(--foreground-muted)]">No audit logs found</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Timestamp
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Action
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Resource
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Actor
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Severity
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--foreground-muted)]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {audits.map((audit: AuditLog) => (
                  <tr
                    key={audit._id}
                    className="hover:bg-[var(--background)] transition-colors"
                  >
                    <td className="p-4 text-sm text-[var(--foreground)]">
                      {formatDate(audit.createdAt)}
                    </td>
                    <td className="p-4">
                      <span className="badge badge-info">{audit.action}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {audit.resourceType}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {audit.resourceName || audit.resourceId}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-[var(--foreground)]">
                          {audit.actorEmail || audit.actorId}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {audit.actorRole}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <SeverityIndicator severity={audit.severity} />
                    </td>
                    <td className="p-4">
                      <StatusBadge success={audit.success} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--foreground-muted)]">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-[var(--foreground)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default withAuth(AdminAuditsPage, ["ADMIN"]);
