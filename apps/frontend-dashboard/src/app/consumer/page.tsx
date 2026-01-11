'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePublicProducts, Product } from '@/lib/hooks';

// Mock data for recently viewed (would be from localStorage/API)
const getRecentlyViewed = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('veridex_recently_viewed');
  return stored ? JSON.parse(stored) : [];
};

// Mock data for favorites (would be from API)
const getFavorites = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('veridex_favorites');
  return stored ? JSON.parse(stored) : [];
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose';
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-violet-500 to-purple-600',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-600',
  };

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--foreground-muted)]">{title}</p>
          <p className="text-3xl font-bold mt-2 text-[var(--foreground)]">{value}</p>
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trend.positive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
            <span className="text-xs text-[var(--foreground-muted)]">{subtitle}</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    category: string;
    complianceStatus?: string;
    organizationName?: string;
  };
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

function ProductCard({ product, onFavorite, isFavorite }: ProductCardProps) {
  const statusColors: Record<string, string> = {
    COMPLIANT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    NON_COMPLIANT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXPIRED: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    COMPLIANT: <Icons.check size={12} />,
    NON_COMPLIANT: <Icons.x size={12} />,
    PENDING: <Icons.clock size={12} />,
    EXPIRED: <Icons.alertTriangle size={12} />,
  };

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 hover:shadow-md hover:border-[var(--primary)]/30 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/consumer/products/${product._id}`} className="hover:text-[var(--primary)] transition-colors">
            <h4 className="font-semibold text-sm text-[var(--foreground)] truncate group-hover:text-[var(--primary)]">
              {product.name}
            </h4>
          </Link>
          <p className="text-xs text-[var(--foreground-muted)] mt-1 truncate">
            {product.organizationName || 'Unknown Merchant'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--foreground-muted)]">
              {product.category}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColors[product.complianceStatus || 'PENDING']}`}>
              {statusIcons[product.complianceStatus || 'PENDING']}
              {product.complianceStatus?.replace('_', ' ') || 'Pending'}
            </span>
          </div>
        </div>
        {onFavorite && (
          <button
            onClick={() => onFavorite(product._id)}
            className={`p-2 rounded-lg transition-colors ${isFavorite
              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
              : 'text-[var(--foreground-muted)] hover:text-rose-500 hover:bg-[var(--muted)]'
              }`}
          >
            <Icons.heart size={16} className={isFavorite ? 'fill-current' : ''} />
          </button>
        )}
      </div>
    </div>
  );
}

interface ActivityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  color: string;
}

function ActivityItem({ icon, title, description, time, color }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--muted)]/50 transition-colors">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-xs text-[var(--foreground-muted)] truncate">{description}</p>
      </div>
      <span className="text-xs text-[var(--foreground-muted)] shrink-0">{time}</span>
    </div>
  );
}

export default function ConsumerDashboard() {
  const { user } = useAuth();
  // Use PUBLIC endpoint for consumers (no auth required to see products)
  const { data: productsData, isLoading: productsLoading } = usePublicProducts({ limit: '100' });
  const products = productsData?.data || [];
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(getFavorites());

    setRecentlyViewed(getRecentlyViewed());
  }, []);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem('veridex_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Calculate stats
  const compliantProducts = products.filter((p: Product) => p.complianceStatus === 'COMPLIANT').length;
  const totalProducts = products.length;
  const complianceRate = totalProducts > 0 ? Math.round((compliantProducts / totalProducts) * 100) : 0;
  const favoriteProducts = products.filter((p: Product) => favorites.includes(p._id));
  const trendingProducts = products.slice(0, 6);

  // Mock activity data
  const recentActivity = [
    { icon: <Icons.eye size={14} className="text-white" />, title: 'Viewed CBD Oil 1000mg', description: 'GreenLeaf Labs', time: '2m ago', color: 'bg-blue-500' },
    { icon: <Icons.check size={14} className="text-white" />, title: 'Compliance Verified', description: 'Hemp Gummies 25mg passed all checks', time: '1h ago', color: 'bg-emerald-500' },
    { icon: <Icons.heart size={14} className="text-white" />, title: 'Added to Favorites', description: 'Organic Hemp Extract', time: '3h ago', color: 'bg-rose-500' },
    { icon: <Icons.alertTriangle size={14} className="text-white" />, title: 'Status Changed', description: 'Full Spectrum Tincture now non-compliant', time: '1d ago', color: 'bg-amber-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  Welcome back, {user?.firstName || 'Consumer'}! 👋
                </h1>
                <p className="text-white/80 mt-1">
                  Browse verified products and check compliance status in real-time.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/consumer/products"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm backdrop-blur-sm transition-colors flex items-center gap-2"
                >
                  <Icons.package size={16} />
                  Browse Products
                </Link>
                <Link
                  href="/consumer/compliance"
                  className="px-4 py-2 bg-white hover:bg-white/90 text-violet-600 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <Icons.shield size={16} />
                  Check Compliance
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Products Checked"
            value={recentlyViewed.length || 12}
            subtitle="This month"
            icon={<Icons.eye size={20} className="text-white" />}
            trend={{ value: 15, positive: true }}
            color="blue"
          />
          <StatCard
            title="Verified Products"
            value={compliantProducts}
            subtitle={`${complianceRate}% compliance rate`}
            icon={<Icons.shield size={20} className="text-white" />}
            color="green"
          />
          <StatCard
            title="Favorites"
            value={favorites.length}
            subtitle="Saved products"
            icon={<Icons.heart size={20} className="text-white" />}
            color="rose"
          />
          <StatCard
            title="Watchlist Alerts"
            value={2}
            subtitle="Pending notifications"
            icon={<Icons.bell size={20} className="text-white" />}
            color="amber"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trending & Favorites */}
          <div className="lg:col-span-2 space-y-6">
            {/* Trending Products */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Icons.trendingUp size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">Trending Products</h3>
                </div>
                <Link href="/consumer/products" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
                  View all <Icons.chevronRight size={14} />
                </Link>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {productsLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-[var(--muted)] animate-pulse" />
                  ))
                ) : trendingProducts.length > 0 ? (
                  trendingProducts.map((product, index) => (
                    <ProductCard
                      key={product._id || product.id || `product-${index}`}
                      product={product}
                      onFavorite={toggleFavorite}
                      isFavorite={favorites.includes(product._id || product.id || '')}
                    />
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-[var(--foreground-muted)]">
                    No products available
                  </div>
                )}
              </div>
            </div>

            {/* Saved Favorites */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                    <Icons.heart size={16} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">Your Favorites</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    {favorites.length}
                  </span>
                </div>
              </div>
              <div className="p-4">
                {favoriteProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {favoriteProducts.slice(0, 4).map((product, index) => (
                      <ProductCard
                        key={product._id || product.id || `fav-${index}`}
                        product={product}
                        onFavorite={toggleFavorite}
                        isFavorite={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
                      <Icons.heart size={24} className="text-[var(--foreground-muted)]" />
                    </div>
                    <p className="text-sm text-[var(--foreground-muted)]">No favorites yet</p>
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                      Click the heart icon on products to save them
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/consumer/products"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icons.search size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Search Products</p>
                    <p className="text-xs text-[var(--foreground-muted)]">Find verified products</p>
                  </div>
                </Link>
                <Link
                  href="/consumer/compare"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icons.gitCompare size={18} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Compare Products</p>
                    <p className="text-xs text-[var(--foreground-muted)]">Side-by-side comparison</p>
                  </div>
                </Link>
                <Link
                  href="/consumer/report"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icons.alertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Report Product</p>
                    <p className="text-xs text-[var(--foreground-muted)]">Flag suspicious items</p>
                  </div>
                </Link>
                <Link
                  href="/consumer/merchants"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icons.building size={18} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">View Merchants</p>
                    <p className="text-xs text-[var(--foreground-muted)]">Check trust scores</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--foreground)]">Recent Activity</h3>
                <Link href="/consumer/activity" className="text-xs text-[var(--primary)] hover:underline">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {recentActivity.map((activity, i) => (
                  <ActivityItem key={i} {...activity} />
                ))}
              </div>
            </div>

            {/* Watchlist Alerts */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                  <Icons.bell size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">Watchlist Alert</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    2 products in your favorites have status updates. Check their compliance status now.
                  </p>
                  <Link
                    href="/consumer/watchlist"
                    className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 mt-2"
                  >
                    View alerts <Icons.chevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
