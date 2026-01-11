'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { usePublicProducts } from '@/lib/hooks';
import Link from 'next/link';

const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Cannabis', value: 'CANNABIS' },
  { label: 'Hemp/CBD', value: 'HEMP_CBD' },
  { label: 'CBD', value: 'CBD' },
  { label: 'Edibles', value: 'EDIBLES' },
  { label: 'Topicals', value: 'TOPICALS' },
  { label: 'Tinctures', value: 'TINCTURES' },
  { label: 'Capsules', value: 'CAPSULES' },
  { label: 'Pet', value: 'PET' },
  { label: 'Supplement', value: 'SUPPLEMENT' },
  { label: 'Pharmaceutical', value: 'PHARMA' },
];

const COMPLIANCE_FILTERS = [
  { label: 'All Products', value: '', icon: Icons.package },
  { label: 'Verified', value: 'COMPLIANT', icon: Icons.check },
  { label: 'Pending', value: 'PENDING', icon: Icons.clock },
  { label: 'Non-Compliant', value: 'NON_COMPLIANT', icon: Icons.x },
  { label: 'Favorites', value: 'FAVORITES', icon: Icons.heart },
];

function ComplianceBadge({ status }: { status?: string }) {
  if (!status) return null;

  const getConfig = () => {
    switch (status) {
      case 'COMPLIANT':
        return {
          label: 'Verified',
          icon: Icons.check,
          className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
        };
      case 'PENDING':
      case 'REQUIRES_REVIEW':
        return {
          label: 'Pending',
          icon: Icons.clock,
          className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
        };
      case 'NON_COMPLIANT':
        return {
          label: 'Non-Compliant',
          icon: Icons.x,
          className: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
        };
      default:
        return {
          label: 'Unknown',
          icon: Icons.clock,
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <IconComponent size={12} />
      {config.label}
    </span>
  );
}

export default function ConsumerProductsPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Fetch products with higher limit to see all (default is 20)
  const { data, isLoading, error, refetch } = usePublicProducts({ limit: '100' });
  const products = useMemo(() => data?.data || [], [data]);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('veridex_favorites');
      if (saved) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFavorites(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse favorites', e);
        }
      }
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('veridex_favorites', JSON.stringify(newFavorites));
      }
      return newFavorites;
    });
  };

  // Initialize search from URL params
  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || product.category === categoryFilter;

      // Handle favorites filter separately
      if (statusFilter === 'FAVORITES') {
        return matchesSearch && matchesCategory && favorites.includes(product._id);
      }

      const complianceStatus = product.complianceStatus || 'PENDING';
      const matchesStatus = !statusFilter || complianceStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter, favorites]);

  // Stats
  const stats = useMemo(() => {
    const verified = products.filter((p) => p.complianceStatus === 'COMPLIANT').length;
    const pending = products.filter((p) => p.complianceStatus === 'PENDING' || p.complianceStatus === 'REQUIRES_REVIEW').length;
    const nonCompliant = products.filter((p) => p.complianceStatus === 'NON_COMPLIANT').length;
    const favoriteCount = favorites.filter(id => products.some(p => p._id === id)).length;
    return {
      total: products.length,
      verified,
      pending,
      nonCompliant,
      favoriteCount,
      complianceRate: products.length ? Math.round((verified / products.length) * 100) : 0,
    };
  }, [products, favorites]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Products"
        description="Browse and verify product compliance status"
        breadcrumbs={[
          { label: 'Consumer', href: '/consumer' },
          { label: 'Products' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-primary-500">
          <p className="text-2xl font-semibold text-[var(--foreground)]">
            {isLoading ? '...' : stats.total}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Total Products</p>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500">
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {isLoading ? '...' : stats.verified}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Verified</p>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-500">
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {isLoading ? '...' : stats.pending}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Pending</p>
        </div>
        <div className="card p-4 border-l-4 border-l-red-500">
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
            {isLoading ? '...' : stats.nonCompliant}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Non-Compliant</p>
        </div>
        <div className="card p-4 border-l-4 border-l-pink-500">
          <p className="text-2xl font-semibold text-pink-600 dark:text-pink-400">
            {isLoading ? '...' : stats.favoriteCount}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Favorites</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Compliance Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {COMPLIANCE_FILTERS.map((filter) => {
              const IconComponent = filter.icon;
              const count = filter.value === '' ? stats.total
                : filter.value === 'COMPLIANT' ? stats.verified
                  : filter.value === 'PENDING' ? stats.pending
                    : filter.value === 'NON_COMPLIANT' ? stats.nonCompliant
                      : filter.value === 'FAVORITES' ? stats.favoriteCount
                        : 0;

              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === filter.value
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-[var(--background)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  <IconComponent size={16} />
                  {filter.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === filter.value
                    ? 'bg-white/20'
                    : 'bg-slate-200 dark:bg-slate-700'
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Category Filter */}
          <select
            className="input max-w-[200px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Icons.search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              size={16}
            />
            <input
              type="text"
              placeholder="Search products..."
              className="input pl-9 w-full lg:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Icons.loader size={32} className="animate-spin text-primary-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card p-8 text-center">
          <p className="text-error-600 dark:text-error-400 mb-4">{error}</p>
          <button className="btn btn-primary" onClick={refetch}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProducts.length === 0 && (
        <div className="card p-8 text-center">
          <Icons.package size={48} className="mx-auto text-[var(--foreground-muted)] mb-4" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No products found</h3>
          <p className="text-[var(--foreground-muted)]">
            {products.length === 0 ? 'No products available yet.' : 'Try adjusting your filters.'}
          </p>
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => {
            const isFavorite = favorites.includes(product._id);

            return (
              <div
                key={`${product._id}-${index}`}
                className="card card-hover overflow-hidden relative group"
              >
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(product._id);
                  }}
                  className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200 ${isFavorite
                    ? 'bg-pink-100 text-pink-500 dark:bg-pink-900/50 dark:text-pink-400 shadow-md'
                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 backdrop-blur-sm opacity-0 group-hover:opacity-100'
                    }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {isFavorite ? (
                    <Icons.starFilled size={18} />
                  ) : (
                    <Icons.heart size={18} />
                  )}
                </button>

                <Link href={`/consumer/products/${product._id}`}>
                  {/* Product Image Placeholder */}
                  <div className="h-40 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center relative">
                    <Icons.package className="text-primary-400" size={48} />
                    {/* Compliance Badge Overlay */}
                    <div className="absolute bottom-3 left-3">
                      <ComplianceBadge status={product.complianceStatus} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-semibold text-[var(--foreground)] line-clamp-2 mb-3">
                      {product.name}
                    </h3>

                    <div className="space-y-2 text-sm text-[var(--foreground-muted)]">
                      <div className="flex items-center gap-2">
                        <Icons.tag size={14} />
                        <span className="font-mono text-xs">{product.sku || 'No SKU'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.folder size={14} />
                        <span>{product.category.replace('_', '/')}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {new Date(product.updatedAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline">
                          View Details
                        </span>
                        <Icons.chevronRight size={14} className="text-primary-600 dark:text-primary-400" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
