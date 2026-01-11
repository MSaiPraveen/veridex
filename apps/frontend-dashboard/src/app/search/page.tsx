'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth-context';
import { useProducts, useDocuments, Product, Document } from '@/lib/hooks';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'document' | 'user' | 'organization' | 'rule';
  href: string;
  status?: string;
  meta?: string;
}

function ResultCard({ result }: { result: SearchResult }) {
  const icons: Record<string, keyof typeof Icons> = {
    product: 'package',
    document: 'fileText',
    user: 'user',
    organization: 'building',
    rule: 'settings',
  };

  const IconComponent = Icons[icons[result.type] || 'search'];

  const typeColors: Record<string, string> = {
    product: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    document: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    user: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    organization: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    rule: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  };

  return (
    <Link
      href={result.href}
      className="card card-hover p-4 flex items-start gap-4"
    >
      <div className={`p-2.5 rounded-lg ${typeColors[result.type]}`}>
        <IconComponent size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[var(--foreground)] truncate">
            {result.title}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] text-[var(--foreground-muted)] capitalize">
            {result.type}
          </span>
        </div>
        <p className="text-sm text-[var(--foreground-muted)] mt-1 truncate">
          {result.description}
        </p>
        {result.meta && (
          <p className="text-xs text-[var(--foreground-muted)] mt-2">
            {result.meta}
          </p>
        )}
      </div>
      <Icons.chevronRight className="text-[var(--foreground-muted)] mt-1" size={16} />
    </Link>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const query = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'documents'>('all');

  // Fetch data
  const { data: productsData, isLoading: loadingProducts } = useProducts();
  const { data: documentsData, isLoading: loadingDocuments } = useDocuments();

  const products = useMemo(() => productsData?.data || [], [productsData]);
  const documents = useMemo(() => documentsData?.data || [], [documentsData]);

  const isLoading = loadingProducts || loadingDocuments;

  // Build search results
  const results = useMemo(() => {
    if (!query) return [];

    const searchLower = query.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search products
    products.forEach((product: Product) => {
      if (
        product.name.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower)
      ) {
        const basePath = user?.role === 'MERCHANT' ? '/merchant' : '/consumer';
        allResults.push({
          id: product._id,
          title: product.name,
          description: product.description || product.category,
          type: 'product',
          href: `${basePath}/products/${product._id}`,
          status: product.status || product.complianceStatus,
          meta: `SKU: ${product.sku || 'N/A'} • Category: ${product.category}`,
        });
      }
    });

    // Search documents (for merchants)
    if (user?.role === 'MERCHANT') {
      documents.forEach((doc: Document) => {
        const fileName = doc.fileName || doc.name || 'Unknown';
        if (
          fileName.toLowerCase().includes(searchLower) ||
          doc.type.toLowerCase().includes(searchLower)
        ) {
          allResults.push({
            id: doc._id,
            title: fileName,
            description: `${doc.type} document`,
            type: 'document',
            href: `/merchant/documents/${doc._id}`,
            status: doc.status,
            meta: `Type: ${doc.type}`,
          });
        }
      });
    }

    return allResults;
  }, [query, products, documents, user]);

  // Filter results by tab
  const filteredResults = useMemo(() => {
    if (activeTab === 'all') return results;
    return results.filter(r => r.type === activeTab.slice(0, -1)); // Remove trailing 's'
  }, [results, activeTab]);

  const productCount = results.filter(r => r.type === 'product').length;
  const documentCount = results.filter(r => r.type === 'document').length;

  return (
    <DashboardLayout>
      <PageHeader
        title="Search Results"
        description={query ? `Showing results for "${query}"` : 'Enter a search query'}
        breadcrumbs={[{ label: 'Search' }]}
      />

      {query && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
            >
              All ({results.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                }`}
            >
              Products ({productCount})
            </button>
            {user?.role === 'MERCHANT' && (
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'documents'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
                  }`}
              >
                Documents ({documentCount})
              </button>
            )}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="space-y-3">
              {filteredResults.map((result) => (
                <ResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Icons.search size={48} className="text-[var(--foreground-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
                No results found
              </h3>
              <p className="text-[var(--foreground-muted)]">
                No matches found for &quot;{query}&quot;. Try different keywords.
              </p>
            </div>
          )}
        </>
      )}

      {!query && (
        <div className="card p-12 text-center">
          <Icons.search size={48} className="text-[var(--foreground-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">
            Start searching
          </h3>
          <p className="text-[var(--foreground-muted)]">
            Use the search bar in the header to find products, documents, and more.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
