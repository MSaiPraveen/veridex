'use client';

import { useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';

interface Merchant {
  _id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  trustScore: number;
  productCount: number;
  compliantProducts: number;
  verifiedSince: string;
  lastAudit?: string;
}

// Mock data - in production, this would come from API
const mockMerchants: Merchant[] = [
  {
    _id: '1',
    name: 'GreenLeaf Labs',
    type: 'MANUFACTURER',
    status: 'ACTIVE',
    trustScore: 92,
    productCount: 6,
    compliantProducts: 4,
    verifiedSince: '2024-06-15',
    lastAudit: '2025-12-01',
  },
  {
    _id: '2',
    name: 'Pure Wellness Co',
    type: 'DISTRIBUTOR',
    status: 'ACTIVE',
    trustScore: 88,
    productCount: 7,
    compliantProducts: 5,
    verifiedSince: '2024-08-20',
    lastAudit: '2025-11-15',
  },
  {
    _id: '3',
    name: 'Herbal Remedies Inc',
    type: 'RETAILER',
    status: 'ACTIVE',
    trustScore: 75,
    productCount: 7,
    compliantProducts: 3,
    verifiedSince: '2024-10-10',
    lastAudit: '2025-10-20',
  },
];

export default function MerchantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'trustScore' | 'name' | 'products'>('trustScore');

  const filteredMerchants = mockMerchants
    .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'trustScore') return b.trustScore - a.trustScore;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'products') return b.productCount - a.productCount;
      return 0;
    });

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getTrustScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score >= 75) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-rose-100 dark:bg-rose-900/30';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  const getStatusBadge = (status: Merchant['status']) => {
    const colors = {
      ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      SUSPENDED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    };
    return colors[status];
  };

  const renderStars = (score: number) => {
    const stars = Math.round(score / 20);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Icons.star
            key={star}
            size={14}
            className={star <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Verified Merchants"
          description="Browse certified merchants and their compliance trust scores"
          breadcrumbs={[
            { label: 'Consumer', href: '/consumer' },
            { label: 'Merchants' },
          ]}
        />

        {/* Search and Filters */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Icons.search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchants..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--foreground-muted)]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 text-sm rounded-lg bg-[var(--muted)] border border-[var(--border)] focus:border-[var(--primary)]"
              >
                <option value="trustScore">Trust Score</option>
                <option value="name">Name</option>
                <option value="products">Products</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trust Score Legend */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
          <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Trust Score Guide</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-[var(--foreground-muted)]">90-100: Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-[var(--foreground-muted)]">75-89: Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-sm text-[var(--foreground-muted)]">Below 75: Needs Review</span>
            </div>
          </div>
        </div>

        {/* Merchants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMerchants.map(merchant => (
            <div key={merchant._id} className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-all group">
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{merchant.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                        {merchant.name}
                      </h3>
                      <p className="text-xs text-[var(--foreground-muted)]">{merchant.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(merchant.status)}`}>
                    {merchant.status}
                  </span>
                </div>
              </div>

              {/* Trust Score */}
              <div className="p-4 bg-[var(--muted)]/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--foreground-muted)]">Trust Score</span>
                  <span className={`text-2xl font-bold ${getTrustScoreColor(merchant.trustScore)}`}>
                    {merchant.trustScore}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getTrustScoreBg(merchant.trustScore).replace('bg-', 'bg-').replace('/30', '')}`}
                    style={{ width: `${merchant.trustScore}%`, backgroundColor: merchant.trustScore >= 90 ? '#10b981' : merchant.trustScore >= 75 ? '#f59e0b' : '#ef4444' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  {renderStars(merchant.trustScore)}
                  <span className={`text-xs font-medium ${getTrustScoreColor(merchant.trustScore)}`}>
                    {getTrustScoreLabel(merchant.trustScore)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Products</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{merchant.productCount}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Compliant</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {merchant.compliantProducts}/{merchant.productCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Verified Since</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {new Date(merchant.verifiedSince).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">Last Audit</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {merchant.lastAudit ? new Date(merchant.lastAudit).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-[var(--border)] flex gap-2">
                <Link
                  href={`/consumer/products?merchant=${merchant._id}`}
                  className="flex-1 px-3 py-2 text-sm font-medium text-center text-[var(--foreground)] bg-[var(--muted)] hover:bg-[var(--muted)]/80 rounded-lg transition-colors"
                >
                  View Products
                </Link>
                <button className="px-3 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors">
                  Follow
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMerchants.length === 0 && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-12 text-center">
            <Icons.building size={48} className="text-[var(--foreground-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No merchants found</h3>
            <p className="text-sm text-[var(--foreground-muted)]">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
