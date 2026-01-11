'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout, PageHeader } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/modal';
import { ProductForm } from '@/components/forms/product-form';
import { useScopedProducts, Product, deleteProduct } from '@/lib/hooks';
import { useAuth } from '@/lib/auth-context';

// Import new modular components
import {
  ProductScope,
  ProductFilters,
  GlobalProductFilters,
  ProductPermission,
  ProductOverrides,
  ScopeTabs,
  ProductsTable,
  OrgProductsFilters,
  GlobalProductsFilters,
  BulkActionsBar,
  BulkImportSummary,
  ImportProductModal,
  ProductAuditPanel,
  ProductsEmptyState,
} from '@/components/merchant/products';

// Default permissions for demo (should come from auth context in production)
const DEFAULT_PERMISSIONS: ProductPermission[] = [
  'products:view',
  'products:create',
  'products:edit',
  'products:delete',
  'products:import',
  'products:bulk_actions',
];

export default function MerchantProductsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // ============================================
  // State Management
  // ============================================

  // Scope & Tab
  const [activeTab, setActiveTab] = useState<ProductScope>('organization');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Organization Filters
  const [orgFilters, setOrgFilters] = useState<ProductFilters>({
    search: '',
    status: '',
    category: '',
    importStatus: '',
    syncStatus: '',
  });

  // Global Filters
  const [globalFilters, setGlobalFilters] = useState<GlobalProductFilters>({
    search: '',
    category: '',
    availability: '',
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [importingProduct, setImportingProduct] = useState<Product | null>(null);
  const [auditProduct, setAuditProduct] = useState<Product | null>(null);

  // Bulk Actions
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: Array<{ productId: string; productName?: string; error: string }>;
  } | null>(null);

  // Loading States
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Permissions (should come from auth context)
  const permissions = DEFAULT_PERMISSIONS;

  // ============================================
  // URL Params Sync
  // ============================================
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    const action = searchParams.get('action');

    if (urlSearch) {
      if (activeTab === 'organization') {
         
        setOrgFilters(prev => ({ ...prev, search: urlSearch }));
      } else {
         
        setGlobalFilters(prev => ({ ...prev, search: urlSearch }));
      }
    }

    // Open create modal if action=new
    if (action === 'new') {
       
      setShowCreateModal(true);
      // Clean up the URL without refreshing
      window.history.replaceState({}, '', '/merchant/products');
    }
  }, [searchParams, activeTab]);

  // ============================================
  // API Query Construction
  // ============================================
  const query = useMemo(() => {
    const filters = activeTab === 'organization' ? orgFilters : globalFilters;
    const params: Record<string, string> = {
      page: String(page),
      limit: '20',
      sortBy: sortColumn,
      sortOrder: sortDirection,
      scope: activeTab === 'global' ? 'all' : activeTab,
    };

    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;

    if (activeTab === 'organization') {
      const f = filters as ProductFilters;
      if (f.status) params.status = f.status;
      if (f.importStatus) params.importStatus = f.importStatus;
      if (f.syncStatus) params.syncStatus = f.syncStatus;
    } else {
      const f = filters as GlobalProductFilters;
      if (f.availability) params.availability = f.availability;
    }

    return params;
  }, [page, sortColumn, sortDirection, activeTab, orgFilters, globalFilters]);

  const { data, isLoading, error, refetch } = useScopedProducts(activeTab === 'global' ? 'global' : 'my', query);

  // ============================================
  // Event Handlers
  // ============================================

  const handleTabChange = useCallback((tab: ProductScope) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const handleOrgFilterChange = useCallback((filters: Partial<ProductFilters>) => {
    setOrgFilters(prev => ({ ...prev, ...filters }));
    setPage(1);
  }, []);

  const handleGlobalFilterChange = useCallback((filters: Partial<GlobalProductFilters>) => {
    setGlobalFilters(prev => ({ ...prev, ...filters }));
    setPage(1);
  }, []);

  const handleResetOrgFilters = useCallback(() => {
    setOrgFilters({ search: '', status: '', category: '', importStatus: '', syncStatus: '' });
    setPage(1);
  }, []);

  const handleResetGlobalFilters = useCallback(() => {
    setGlobalFilters({ search: '', category: '', availability: '' });
    setPage(1);
  }, []);

  // Selection Handlers
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected && data?.data) {
      setSelectedIds(new Set(data.data.map(p => p._id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [data?.data]);

  const handleSelectOne = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Delete Handler
  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct._id);
      setDeletingProduct(null);
      refetch();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Import Handler
  const handleImportProduct = async (
    productId: string,
    overrides?: ProductOverrides,
    autoSync?: boolean
  ) => {
    setIsImporting(true);
    try {
      const response = await fetch(`/api/products/${productId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: user?.organizationId,
          overrides,
          autoSync,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import product');
      }

      // Switch to organization tab and refresh
      setActiveTab('organization');
      setImportingProduct(null);
      refetch();
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setIsImporting(false);
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteProduct(id))
      );
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkImport = async () => {
    setIsBulkProcessing(true);
    try {
      const response = await fetch('/api/products/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          organizationId: user?.organizationId,
        }),
      });

      const result = await response.json();
      setBulkImportResult(result.data);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk import failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkActivate = async () => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          })
        )
      );
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      console.error('Bulk activate failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ARCHIVED' }),
          })
        )
      );
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      console.error('Bulk deactivate failed:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // ============================================
  // Derived State
  // ============================================
  const products = data?.data || [];
  const selectedProducts = products.filter(p => selectedIds.has(p._id));
  const hasActiveFilters = activeTab === 'organization'
    ? Object.values(orgFilters).some(v => v)
    : Object.values(globalFilters).some(v => v);

  // ============================================
  // Render
  // ============================================
  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Products"
        description="Manage your product catalog and compliance status"
        breadcrumbs={[
          { label: 'Merchant', href: '/merchant' },
          { label: 'Products' },
        ]}
        actions={
          activeTab === 'organization' && permissions.includes('products:create') ? (
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
              onClick={() => setShowCreateModal(true)}
            >
              <Icons.plus size={18} />
              Add Product
            </button>
          ) : null
        }
      />

      {/* Scope Tabs */}
      <div className="mb-6">
        <ScopeTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          orgProductCount={activeTab === 'organization' ? data?.total : undefined}
          globalProductCount={activeTab === 'global' ? data?.total : undefined}
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        {activeTab === 'organization' ? (
          <OrgProductsFilters
            filters={orgFilters}
            onFilterChange={handleOrgFilterChange}
            onReset={handleResetOrgFilters}
            resultCount={data?.total}
            isLoading={isLoading}
          />
        ) : (
          <GlobalProductsFilters
            filters={globalFilters}
            onFilterChange={handleGlobalFilterChange}
            onReset={handleResetGlobalFilters}
            resultCount={data?.total}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <Icons.alertTriangle size={20} className="text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <ProductsEmptyState
          scope={activeTab}
          hasFilters={hasActiveFilters}
          onCreateProduct={() => setShowCreateModal(true)}
          onImportFromGlobal={() => setActiveTab('global')}
          onClearFilters={activeTab === 'organization' ? handleResetOrgFilters : handleResetGlobalFilters}
        />
      )}

      {/* Products Table */}
      {(isLoading || products.length > 0) && (
        <ProductsTable
          products={products}
          scope={activeTab}
          isLoading={isLoading}
          permissions={permissions}
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          limit={data?.limit || 20}
          onPageChange={setPage}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onView={(product) => console.log('View', product)}
          onEdit={(product) => setEditingProduct(product)}
          onDelete={(product) => setDeletingProduct(product)}
          onImport={(product) => setImportingProduct(product)}
          onViewAudit={(product) => setAuditProduct(product)}
        />
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        scope={activeTab}
        selectedProducts={selectedProducts}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkDelete={() => setShowBulkDeleteConfirm(true)}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onBulkImport={handleBulkImport}
        onBulkAssignCategory={() => console.log('Bulk assign category')}
        permissions={permissions}
        isProcessing={isBulkProcessing}
      />

      {/* Create/Edit Modal */}
      <ProductForm
        isOpen={showCreateModal || !!editingProduct}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProduct(null);
        }}
        onSuccess={refetch}
        product={editingProduct}
        organizationId={user?.organizationId || ''}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedIds.size} selected product(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Products`}
        variant="danger"
        isLoading={isBulkProcessing}
      />

      {/* Import Product Modal */}
      <ImportProductModal
        isOpen={!!importingProduct}
        onClose={() => setImportingProduct(null)}
        product={importingProduct}
        onImport={handleImportProduct}
        isImporting={isImporting}
      />

      {/* Product Audit Panel */}
      <ProductAuditPanel
        isOpen={!!auditProduct}
        onClose={() => setAuditProduct(null)}
        product={auditProduct}
        onDetachFromGlobal={() => console.log('Detach from global')}
        onReviewUpdates={() => console.log('Review updates')}
      />

      {/* Bulk Import Summary */}
      <BulkImportSummary
        isOpen={!!bulkImportResult}
        onClose={() => {
          setBulkImportResult(null);
          setActiveTab('organization');
          refetch();
        }}
        result={bulkImportResult || undefined}
      />
    </DashboardLayout>
  );
}
