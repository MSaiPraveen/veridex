'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Command,
  Building2,
  Package,
  FileText,
  Users,
  Shield,
  X,
  ArrowRight,
  Clock,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'organization' | 'product' | 'document' | 'user' | 'batch';
  title: string;
  subtitle?: string;
  href: string;
  status?: string;
  highlight?: string;
}

const typeConfig: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  organization: { icon: Building2, color: 'text-purple-400', label: 'Organization' },
  product: { icon: Package, color: 'text-blue-400', label: 'Product' },
  document: { icon: FileText, color: 'text-green-400', label: 'Document' },
  user: { icon: Users, color: 'text-amber-400', label: 'User' },
  batch: { icon: Shield, color: 'text-cyan-400', label: 'Batch' },
};

// Import adminApi
import { adminApi } from '@/lib/admin-api';

// Real search function
const performSearch = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const encodedQuery = encodeURIComponent(query);

  try {
    const [orgsRes, productsRes, usersRes] = await Promise.allSettled([
      adminApi.get<any>(`/organizations?search=${encodedQuery}&limit=5`),
      adminApi.get<any>(`/products?search=${encodedQuery}&limit=5`),
      adminApi.get<any>(`/users?role=merchant&search=${encodedQuery}&limit=5`)
    ]);

    // Process Organizations
    if (orgsRes.status === 'fulfilled' && orgsRes.value.success) {
      const orgs = orgsRes.value.data?.data || [];
      if (Array.isArray(orgs)) {
        orgs.forEach((org: any) => {
          results.push({
            id: org.id || org._id,
            type: 'organization',
            title: org.name,
            subtitle: `${org.type} • ${org.address?.city || 'Unknown Location'}`,
            href: `/organizations/${org.id || org._id}`,
            status: org.isActive ? 'Active' : 'Inactive'
          });
        });
      }
    }

    // Process Products
    if (productsRes.status === 'fulfilled' && productsRes.value.success) {
      const products = productsRes.value.data?.data || [];
      if (Array.isArray(products)) {
        products.forEach((prod: any) => {
          results.push({
            id: prod.id || prod._id,
            type: 'product',
            title: prod.name,
            subtitle: `${prod.category} • ${prod.merchantName || 'Unknown Merchant'}`,
            href: `/products/${prod.id || prod._id}`,
            status: prod.complianceStatus || 'Pending'
          });
        });
      }
    }

    // Process Users (Merchants)
    if (usersRes.status === 'fulfilled' && usersRes.value.success) {
      const users = usersRes.value.data?.data || [];
      if (Array.isArray(users)) {
        users.forEach((user: any) => {
          // For now we only search merchants as requested
          const isMerchant = user.role === 'MERCHANT';

          results.push({
            id: user.id || user._id,
            type: 'user', // Icon type
            title: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            subtitle: `${user.email} • ${user.role}`,
            href: isMerchant ? `/merchants/${user.id || user._id}` : `/users/${user.id || user._id}`,
            status: user.isActive ? 'Active' : 'Inactive'
          });
        });
      }
    }

  } catch (error) {
    console.error('Search aggregation failed:', error);
  }

  return results;
};

const recentSearches = [
  { query: 'GreenLeaf Labs', type: 'organization' },
  { query: 'CBD Oil', type: 'product' },
  { query: 'Lab Report', type: 'document' },
];

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search effect
  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchResults = await performSearch(query);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      setIsOpen(false);
      setQuery('');
      // Navigation handled by Link component
    }
  }, [results, selectedIndex]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-400 hover:text-white hover:border-slate-500 transition-all w-64 group"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search everything...</span>
        <div className="ml-auto flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-600/50 rounded border border-slate-500/50 group-hover:border-slate-400/50">
            <Command className="h-2.5 w-2.5 inline" />
          </kbd>
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-600/50 rounded border border-slate-500/50 group-hover:border-slate-400/50">
            K
          </kbd>
        </div>
      </button>

      {/* Mobile Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Search Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[1300]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Search Panel */}
          <div className="relative max-w-2xl mx-auto mt-20 sm:mt-32">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700/50">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-slate-400" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyNavigation}
                  placeholder="Search organizations, products, documents..."
                  className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-lg"
                />
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query && results.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Results
                    </div>
                    {results.map((result, index) => {
                      const config = typeConfig[result.type];
                      const Icon = config.icon;

                      return (
                        <Link
                          key={result.id}
                          href={result.href}
                          onClick={handleClose}
                          className={`
                            flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer
                            ${index === selectedIndex ? 'bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}
                          `}
                        >
                          <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-white font-medium truncate">{result.title}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">
                              {config.label}
                            </span>
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {query && results.length === 0 && !isLoading && (
                  <div className="p-8 text-center">
                    <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No results found for &quot;{query}&quot;</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try searching with different keywords</p>
                  </div>
                )}

                {!query && (
                  <div className="p-2">
                    {/* Recent Searches */}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Recent Searches
                    </div>
                    {recentSearches.map((recent, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(recent.query)}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-left"
                      >
                        <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-700 dark:text-slate-300">{recent.query}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{recent.type}</span>
                      </button>
                    ))}

                    {/* Quick Links */}
                    <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Quick Actions
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2">
                      {[
                        { label: 'View Organizations', href: '/organizations', icon: Building2 },
                        { label: 'Review Queue', href: '/compliance-queue', icon: Shield },
                        { label: 'All Products', href: '/products', icon: Package },
                        { label: 'Documents', href: '/documents', icon: FileText },
                      ].map((action) => (
                        <Link
                          key={action.href}
                          href={action.href}
                          onClick={handleClose}
                          className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <action.icon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{action.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
