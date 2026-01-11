'use client';

import { Icons } from '@/components/ui/icons';
import { Product, ProductProvenance } from './types';

interface ProductAuditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  provenance?: ProductProvenance;
  onDetachFromGlobal?: () => void;
  onReviewUpdates?: () => void;
}

export function ProductAuditPanel({
  isOpen,
  onClose,
  product,
  provenance,
  onDetachFromGlobal,
  onReviewUpdates,
}: ProductAuditPanelProps) {
  if (!isOpen || !product) return null;

  const isImported = !!product.sourceProductId;
  const isOutOfSync = product.syncStatus === 'OUT_OF_SYNC';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[var(--card)] border-l border-[var(--border)] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Audit & Provenance
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-0.5 truncate max-w-[280px]">
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            <Icons.x size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Origin Card */}
          <div className="p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-lg
                ${isImported 
                  ? 'bg-violet-100 dark:bg-violet-900/30' 
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
                }
              `}>
                {isImported ? (
                  <Icons.import size={20} className="text-violet-600 dark:text-violet-400" />
                ) : (
                  <Icons.package size={20} className="text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  {isImported ? 'Imported from Global Catalog' : 'Organization Product'}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {isImported ? 'This product was imported' : 'Created in your organization'}
                </p>
              </div>
            </div>

            {/* Origin Details */}
            <div className="space-y-3">
              {isImported && (
                <>
                  <InfoRow 
                    label="Import Date" 
                    value={product.importedAt ? formatDate(product.importedAt) : '—'} 
                  />
                  <InfoRow 
                    label="Imported By" 
                    value={product.importedBy || '—'} 
                  />
                  <InfoRow 
                    label="Source Product ID" 
                    value={product.sourceProductId || '—'} 
                    mono
                  />
                </>
              )}
              <InfoRow 
                label="Created At" 
                value={formatDate(product.createdAt)} 
              />
              <InfoRow 
                label="Last Updated" 
                value={formatDate(product.updatedAt)} 
              />
            </div>
          </div>

          {/* Sync Status Card (for imported products) */}
          {isImported && (
            <div className="p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Icons.sync size={16} />
                Sync Status
              </h3>

              <div className="space-y-4">
                {/* Sync Mode */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]">
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      Auto-sync enabled
                    </span>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Receives updates from global
                    </p>
                  </div>
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${product.autoSyncEnabled 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  `}>
                    {product.autoSyncEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                {/* Out of Sync Warning */}
                {isOutOfSync && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Icons.alertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Global product has been updated
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Last global update: {product.lastGlobalUpdate ? formatDate(product.lastGlobalUpdate) : 'Unknown'}
                        </p>
                        {onReviewUpdates && (
                          <button
                            onClick={onReviewUpdates}
                            className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 underline hover:no-underline"
                          >
                            Review & apply updates →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Last Override */}
                {product.lastLocalOverride && (
                  <div className="space-y-2">
                    <InfoRow 
                      label="Last Local Override" 
                      value={formatDate(product.lastLocalOverride)} 
                    />
                    <InfoRow 
                      label="Overridden By" 
                      value={product.overriddenBy || '—'} 
                    />
                  </div>
                )}

                {/* Detach Action */}
                {onDetachFromGlobal && product.syncStatus !== 'DETACHED' && (
                  <button
                    onClick={onDetachFromGlobal}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <Icons.link size={16} />
                    Detach from Global
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Overrides Card */}
          {product.overrides && Object.keys(product.overrides).length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Icons.edit size={16} />
                Local Overrides
              </h3>
              <div className="space-y-2">
                {product.overrides.price !== undefined && (
                  <OverrideRow label="Price" value={`$${product.overrides.price.toFixed(2)}`} />
                )}
                {product.overrides.visibility && (
                  <OverrideRow label="Visibility" value={product.overrides.visibility} />
                )}
                {product.overrides.description && (
                  <OverrideRow label="Description" value="Custom" />
                )}
                {product.overrides.tags && product.overrides.tags.length > 0 && (
                  <OverrideRow label="Tags" value={product.overrides.tags.join(', ')} />
                )}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {provenance?.auditTrail && provenance.auditTrail.length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <Icons.clock size={16} />
                Audit Trail
              </h3>
              <div className="space-y-3">
                {provenance.auditTrail.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--foreground)]">
                        {entry.action}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        {entry.userName || entry.userId} • {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Notice */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Icons.shield size={18} className="text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Veridex Compliance Tracking
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  All changes to this product are tracked for compliance and audit purposes. Contact support if you need a full audit export.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================
function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--foreground-muted)]">{label}</span>
      <span className={`text-[var(--foreground)] ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function OverrideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
      <span className="text-sm text-violet-700 dark:text-violet-300">{label}</span>
      <span className="text-sm font-medium text-violet-800 dark:text-violet-200">{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
