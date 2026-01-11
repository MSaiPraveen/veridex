"use client";

import Link from "next/link";
import { Icons } from "@/components/ui/icons";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm mb-2">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && (
                <Icons.chevronRight className="text-[var(--foreground-muted)]" size={14} />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[var(--foreground)]">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
