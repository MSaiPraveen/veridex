'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useProducts } from '@/lib/hooks';

interface ReportForm {
  productId: string;
  reason: string;
  description: string;
  evidence?: string;
}

export default function ReportProductPage() {
  const { data: productsData, isLoading: loading } = useProducts({ limit: '50' });
  const products = productsData?.data || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [form, setForm] = useState<ReportForm>({
    productId: '',
    reason: '',
    description: '',
    evidence: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const reasons = [
    { value: 'fake_product', label: 'Suspected Counterfeit/Fake Product' },
    { value: 'misleading_claims', label: 'Misleading Product Claims' },
    { value: 'safety_concern', label: 'Safety Concern' },
    { value: 'incorrect_info', label: 'Incorrect Product Information' },
    { value: 'expired_docs', label: 'Expired/Invalid Documentation' },
    { value: 'other', label: 'Other' },
  ];

  const selectProduct = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setForm(prev => ({ ...prev, productId: product._id }));
    setShowSelector(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Icons.check size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Report Submitted</h2>
            <p className="text-[var(--foreground-muted)] mb-6">
              Thank you for helping keep our platform safe. Our team will review your report within 24-48 hours.
            </p>
            <div className="bg-[var(--muted)] rounded-lg p-4 mb-6">
              <p className="text-sm text-[var(--foreground-muted)]">Reference Number</p>
              <p className="text-lg font-mono font-bold text-[var(--foreground)]">
                RPT-{Date.now().toString(36).toUpperCase()}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setSelectedProduct(null);
                  setForm({ productId: '', reason: '', description: '', evidence: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
              >
                Submit Another Report
              </button>
              <a
                href="/consumer"
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Report Suspicious Product"
          description="Help us maintain platform integrity by reporting suspicious or non-compliant products"
          breadcrumbs={[
            { label: 'Consumer', href: '/consumer' },
            { label: 'Report Product' },
          ]}
        />

        {/* Warning Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 p-4">
          <div className="flex gap-3">
            <Icons.alertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Important</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Please only submit reports for genuine concerns. False reports may result in account restrictions. 
                All reports are reviewed by our compliance team.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Select Product *
            </label>
            {selectedProduct ? (
              <div className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Icons.package size={20} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--foreground)]">{selectedProduct.name}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{selectedProduct.category} • SKU: {selectedProduct.sku || 'N/A'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setForm(prev => ({ ...prev, productId: '' }));
                  }}
                  className="p-2 text-[var(--foreground-muted)] hover:text-rose-500 transition-colors"
                >
                  <Icons.x size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSelector(!showSelector)}
                  className="w-full p-3 text-left bg-[var(--muted)] rounded-lg border border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors flex items-center gap-3"
                >
                  <Icons.search size={18} className="text-[var(--foreground-muted)]" />
                  <span className="text-[var(--foreground-muted)]">Search for a product...</span>
                </button>

                {showSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-[var(--border)]">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type product name or SKU..."
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--muted)] border-0 focus:ring-2 focus:ring-[var(--primary)]"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-[var(--foreground-muted)]">Loading...</div>
                      ) : filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 10).map(product => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => selectProduct(product)}
                            className="w-full px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors flex items-center gap-3"
                          >
                            <Icons.package size={18} className="text-[var(--foreground-muted)]" />
                            <div>
                              <p className="text-sm font-medium text-[var(--foreground)]">{product.name}</p>
                              <p className="text-xs text-[var(--foreground-muted)]">{product.category}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-[var(--foreground-muted)]">No products found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Reason for Report *
            </label>
            <select
              value={form.reason}
              onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
              required
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
            >
              <option value="">Select a reason...</option>
              {reasons.map(reason => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={4}
              placeholder="Please provide details about your concern..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors resize-none"
            />
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Minimum 20 characters. Be as specific as possible.
            </p>
          </div>

          {/* Evidence URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Evidence URL (Optional)
            </label>
            <input
              type="url"
              value={form.evidence}
              onChange={(e) => setForm(prev => ({ ...prev, evidence: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
            />
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Link to any supporting evidence (images, documents, etc.)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <a
              href="/consumer"
              className="px-4 py-2.5 text-sm font-medium text-[var(--foreground)] bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={!form.productId || !form.reason || form.description.length < 20 || isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Icons.flag size={16} />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
