'use client';

import { DashboardLayout } from '@/components/layout';
import { Icons } from '@/components/ui/icons';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useProduct, useProductDocuments } from '@/lib/hooks';
import { DocumentList } from '@/components/ui/document-viewer';

export default function ProductDetailPage() {
    const params = useParams();

    // Safely handle params
    const rawId = params?.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    const { data: productResponse, isLoading: productLoading, error: productError } = useProduct(id || null);

    // Get documents specifically for this product
    const { data: documentsResponse } = useProductDocuments(id || null);

    const product = productResponse?.data;
    const documents = documentsResponse?.data || [];

    if (productLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[500px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (productError || !product) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                    <Icons.alertCircle className="text-destructive mb-4" size={48} />
                    <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The product you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
                    </p>
                    <Link href="/merchant/products" className="btn-primary">
                        Back to Products
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    // Helper to format currency
    const formatCurrency = (amount?: number, currency = 'USD') => {
        if (amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    };

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'APPROVED': return 'badge-success';
            case 'PENDING_REVIEW': return 'badge-warning';
            case 'REJECTED': return 'badge-error';
            case 'DRAFT': return 'badge-secondary';
            default: return 'badge-secondary';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href="/merchant/products" className="hover:text-foreground">Products</Link>
                    <Icons.chevronRight size={14} />
                    <span className="text-foreground font-medium">{product.name}</span>
                </div>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
                        <div className="flex items-center gap-3">
                            <span className={`badge ${getStatusBadge(product.status)}`}>
                                {product.status?.replace('_', ' ') || 'DRAFT'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                SKU: {product.sku || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/merchant/products/${id}/edit`} className="btn-secondary">
                            <Icons.edit size={16} className="mr-2" />
                            Edit Product
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overview Card */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold mb-4">Overview</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm text-muted-foreground">Category</label>
                                    <p className="font-medium">{product.category}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Brand</label>
                                    <p className="font-medium">{product.brand || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Price</label>
                                    <p className="font-medium">{formatCurrency(product.price, product.currency)}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground">Quantity</label>
                                    <p className="font-medium">{product.quantity} {product.unit || 'units'}</p>
                                </div>
                            </div>
                            {product.description && (
                                <div className="mt-6">
                                    <label className="text-sm text-muted-foreground">Description</label>
                                    <p className="mt-1 text-sm leading-relaxed">{product.description}</p>
                                </div>
                            )}
                        </div>

                        {/* Compliance & Lab Results */}
                        <div className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Compliance & Lab Results</h3>
                                <span className={`badge ${product.complianceStatus === 'COMPLIANT' ? 'badge-success' : 'badge-warning'
                                    }`}>
                                    {product.complianceStatus || 'PENDING'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icons.activity size={16} className="text-primary" />
                                        <span className="font-medium">THC Content</span>
                                    </div>
                                    <p className="text-2xl font-bold">{product.thcContent || 0}%</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icons.activity size={16} className="text-blue-500" />
                                        <span className="font-medium">CBD Content</span>
                                    </div>
                                    <p className="text-2xl font-bold">{product.cbdContent || 0}%</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                        Associated Documents
                                    </h4>
                                    <Link href="/merchant/documents" className="text-primary text-sm hover:underline">
                                        + Upload
                                    </Link>
                                </div>
                                <DocumentList 
                                    documents={documents} 
                                    emptyMessage="No documents uploaded for this product"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Image Card */}
                        <div className="card overflow-hidden">
                            <div className="aspect-square bg-muted flex items-center justify-center relative">
                                {product.images && product.images.length > 0 ? (
                                    <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <Icons.package className="text-muted-foreground opacity-20" size={64} />
                                )}
                            </div>
                        </div>

                        {/* Tracking Info */}
                        <div className="card p-6">
                            <h3 className="text-lg font-semibold mb-4">Inventory & Tracking</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs uppercase text-muted-foreground font-semibold">SKU</label>
                                    <p className="font-mono">{product.sku}</p>
                                </div>
                                {product.batchNumber && (
                                    <div>
                                        <label className="text-xs uppercase text-muted-foreground font-semibold">Batch Number</label>
                                        <p className="font-mono">{product.batchNumber}</p>
                                    </div>
                                )}
                                {product.harvestDate && (
                                    <div>
                                        <label className="text-xs uppercase text-muted-foreground font-semibold">Harvest Date</label>
                                        <p>{new Date(product.harvestDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                {product.expirationDate && (
                                    <div>
                                        <label className="text-xs uppercase text-muted-foreground font-semibold">Expiration Date</label>
                                        <p>{new Date(product.expirationDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
