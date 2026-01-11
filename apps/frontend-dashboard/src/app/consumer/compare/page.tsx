'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useProducts } from '@/lib/hooks';

interface ComparisonProduct {
  _id: string;
  name: string;
  category: string;
  complianceStatus?: string;
  sku?: string;
  thcContent?: number;
  cbdContent?: number;
  organizationName?: string;
}

export default function ProductComparisonPage() {
  const { data: productsData, isLoading: loading } = useProducts({ limit: '50' });
  const products = productsData?.data || [];
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const comparisonProducts = products?.filter(p => selectedProducts.includes(p._id)) || [];

  const addProduct = (productId: string) => {
    if (selectedProducts.length < 4 && !selectedProducts.includes(productId)) {
      setSelectedProducts([...selectedProducts, productId]);
    }
    setShowSelector(false);
    setSearchQuery('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(id => id !== productId));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'NON_COMPLIANT':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <Icons.check size={14} />;
      case 'NON_COMPLIANT':
        return <Icons.x size={14} />;
      case 'PENDING':
        return <Icons.clock size={14} />;
      default:
        return <Icons.alertTriangle size={14} />;
    }
  };

  const comparisonFields = [
    {
      key: 'complianceStatus', label: 'Compliance Status', render: (p: ComparisonProduct) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(p.complianceStatus)}`}>
          {getStatusIcon(p.complianceStatus)}
          {p.complianceStatus?.replace('_', ' ') || 'Unknown'}
        </span>
      )
    },
    {
      key: 'category', label: 'Category', render: (p: ComparisonProduct) => (
        <span className="text-sm">{p.category}</span>
      )
    },
    {
      key: 'sku', label: 'SKU', render: (p: ComparisonProduct) => (
        <span className="text-sm font-mono">{p.sku || 'N/A'}</span>
      )
    },
    {
      key: 'thcContent', label: 'THC Content', render: (p: ComparisonProduct) => (
        <span className="text-sm">{p.thcContent ? `${p.thcContent}%` : 'N/A'}</span>
      )
    },
    {
      key: 'cbdContent', label: 'CBD Content', render: (p: ComparisonProduct) => (
        <span className="text-sm">{p.cbdContent ? `${p.cbdContent}%` : 'N/A'}</span>
      )
    },
    {
      key: 'merchant', label: 'Merchant', render: (p: ComparisonProduct) => (
        <span className="text-sm">{p.organizationName || 'Unknown'}</span>
      )
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Compare Products"
          description="Compare compliance status and details of multiple products side by side"
          breadcrumbs={[
            { label: 'Consumer', href: '/consumer' },
            { label: 'Compare Products' },
          ]}
        />

        {/* Product Selection */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">
              Selected Products ({selectedProducts.length}/4)
            </h3>
            {selectedProducts.length > 0 && (
              <button
                onClick={() => setSelectedProducts([])}
                className="text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Selected products */}
            {comparisonProducts.map(product => (
              <div key={product._id} className="relative bg-[var(--muted)] rounded-xl p-4 group">
                <button
                  onClick={() => removeProduct(product._id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icons.x size={14} />
                </button>
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${getStatusColor(product.complianceStatus)}`}>
                    {getStatusIcon(product.complianceStatus)}
                  </div>
                  <p className="font-medium text-sm text-[var(--foreground)] truncate">{product.name}</p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">{product.category}</p>
                </div>
              </div>
            ))}

            {/* Add product button */}
            {selectedProducts.length < 4 && (
              <div className="relative">
                <button
                  onClick={() => setShowSelector(!showSelector)}
                  className="w-full h-full min-h-[120px] bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <Icons.plus size={20} className="text-[var(--primary)]" />
                  </div>
                  <span className="text-sm text-[var(--foreground-muted)]">Add Product</span>
                </button>

                {/* Product selector dropdown */}
                {showSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-[var(--border)]">
                      <div className="relative">
                        <Icons.search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search products..."
                          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-[var(--muted)] border-0 focus:ring-2 focus:ring-[var(--primary)]"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {loading ? (
                        <div className="p-4 text-center text-[var(--foreground-muted)]">Loading...</div>
                      ) : filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 10).map(product => (
                          <button
                            key={product._id}
                            onClick={() => addProduct(product._id)}
                            disabled={selectedProducts.includes(product._id)}
                            className="w-full px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(product.complianceStatus)}`}>
                              {getStatusIcon(product.complianceStatus)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] truncate">{product.name}</p>
                              <p className="text-xs text-[var(--foreground-muted)]">{product.category}</p>
                            </div>
                            {selectedProducts.includes(product._id) && (
                              <Icons.check size={16} className="text-emerald-500" />
                            )}
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

            {/* Empty slots */}
            {Array(Math.max(0, 3 - selectedProducts.length)).fill(0).map((_, i) => (
              <div key={i} className="min-h-[120px] bg-[var(--muted)]/50 rounded-xl border-2 border-dashed border-[var(--border)]/50 flex items-center justify-center">
                <span className="text-sm text-[var(--foreground-muted)]/50">Empty slot</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        {comparisonProducts.length >= 2 && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-[var(--foreground)]">Comparison Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)] bg-[var(--muted)]/50 w-40">
                      Attribute
                    </th>
                    {comparisonProducts.map(product => (
                      <th key={product._id} className="px-6 py-4 text-left text-sm font-semibold text-[var(--foreground)] bg-[var(--muted)]/50">
                        {product.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map((field, i) => (
                    <tr key={field.key} className={i % 2 === 0 ? '' : 'bg-[var(--muted)]/30'}>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--foreground-muted)]">
                        {field.label}
                      </td>
                      {comparisonProducts.map(product => (
                        <td key={product._id} className="px-6 py-4 text-[var(--foreground)]">
                          {field.render(product as ComparisonProduct)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {comparisonProducts.length < 2 && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <Icons.gitCompare size={32} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Select at least 2 products to compare
            </h3>
            <p className="text-sm text-[var(--foreground-muted)] max-w-md mx-auto">
              Use the Add Product button above to select products you want to compare side by side.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
