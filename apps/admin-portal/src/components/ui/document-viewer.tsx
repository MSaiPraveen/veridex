'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, X, Eye, AlertCircle, Sparkles, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdminAccessToken } from '@/lib/admin-api';

// Document interface
export interface DocumentData {
  id: string;
  _id?: string;
  name: string;
  type: string;
  mimeType?: string;
  fileSize?: number;
  status?: string;
  extracted?: {
    issuedTo?: string;
    issuedBy?: string;
    licenseNumber?: string;
    validUntil?: string;
    thcContent?: number;
    cbdContent?: number;
    batchNumber?: string;
    confidence?: number;
  };
}

// Get the document ID (handle both _id and id)
function getDocId(doc: DocumentData): string {
  return doc._id || doc.id;
}

// API base URL for admin portal - connects to API Gateway (port 3002 in Docker)
const API_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3002';

// Helper functions for document URLs
export function getDocumentContentUrl(documentId: string): string {
  return `${API_BASE_URL}/documents/${documentId}/content`;
}

export function getDocumentDownloadUrl(documentId: string): string {
  return `${API_BASE_URL}/documents/${documentId}/download`;
}

interface DocumentViewerProps {
  document: DocumentData;
  onClose?: () => void;
}

/**
 * DocumentViewer component that fetches documents with proper authentication
 * Uses Blob URLs to display documents since iframes can't send auth headers
 */
export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const docId = getDocId(document);
  const contentUrl = getDocumentContentUrl(docId);
  const downloadUrl = getDocumentDownloadUrl(docId);

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType?.startsWith('image/');

  // Fetch document with authentication and create blob URL
  useEffect(() => {
    let mounted = true;
    
    async function fetchDocument() {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = getAdminAccessToken();
        
        if (!token) {
          throw new Error('Not authenticated. Please log in again.');
        }
        
        const response = await fetch(contentUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-Admin-Portal': 'true',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        if (mounted) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Document fetch error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load document');
          setIsLoading(false);
        }
      }
    }
    
    fetchDocument();
    
    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, contentUrl]);

  const handleLoad = () => {
    // Loading already handled in useEffect
  };

  const handleError = () => {
    setError('Failed to display document');
  };
  
  // Download handler with authentication
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      const token = getAdminAccessToken();
      const response = await fetch(downloadUrl, {
        headers: token ? { 
          'Authorization': `Bearer ${token}`,
          'X-Admin-Portal': 'true',
        } : {},
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{document.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {document.type?.replace(/_/g, ' ')} • {formatFileSize(document.fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-900/50 min-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-red-500 font-medium">{error}</p>
              <Button onClick={handleDownload} className="mt-4">
                Download Instead
              </Button>
            </div>
          )}

          {isPdf && !error && blobUrl && (
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full min-h-[600px] rounded-lg"
              onLoad={handleLoad}
              onError={handleError}
              title={document.name}
            />
          )}

          {isImage && !error && blobUrl && (
            <div className="flex items-center justify-center h-full">
              <img
                src={blobUrl}
                alt={document.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>
          )}

          {!isPdf && !isImage && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-16 w-16 text-slate-400 mb-4" />
              <p className="text-slate-500 mb-2">Preview not available for this file type</p>
              <p className="text-sm text-slate-400 mb-4">{document.mimeType}</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </div>
          )}
        </div>

        {/* Extracted Data Section */}
        {document.extracted && Object.keys(document.extracted).length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Extracted Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {document.extracted.issuedTo && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Issued To:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{document.extracted.issuedTo}</p>
                </div>
              )}
              {document.extracted.issuedBy && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Issued By:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{document.extracted.issuedBy}</p>
                </div>
              )}
              {document.extracted.licenseNumber && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">License #:</span>
                  <p className="font-medium font-mono text-slate-900 dark:text-white">{document.extracted.licenseNumber}</p>
                </div>
              )}
              {document.extracted.validUntil && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Valid Until:</span>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {new Date(document.extracted.validUntil).toLocaleDateString()}
                  </p>
                </div>
              )}
              {document.extracted.thcContent !== undefined && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">THC Content:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{document.extracted.thcContent}%</p>
                </div>
              )}
              {document.extracted.cbdContent !== undefined && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">CBD Content:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{document.extracted.cbdContent}%</p>
                </div>
              )}
              {document.extracted.batchNumber && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Batch #:</span>
                  <p className="font-medium font-mono text-slate-900 dark:text-white">{document.extracted.batchNumber}</p>
                </div>
              )}
              {document.extracted.confidence !== undefined && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Confidence:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{Math.round(document.extracted.confidence * 100)}%</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// Document card with view button
interface DocumentCardProps {
  document: DocumentData;
  onView?: (doc: DocumentData) => void;
}

export function DocumentCard({ document, onView }: DocumentCardProps) {
  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType?.startsWith('image/');

  // Get the icon component based on document type
  const TypeIcon = isPdf ? FileText : isImage ? Image : File;

  const getStatusConfig = () => {
    switch (document.status) {
      case 'APPROVED':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500' };
      case 'PENDING_REVIEW':
        return { bg: 'bg-amber-500/10', text: 'text-amber-500' };
      case 'REJECTED':
        return { bg: 'bg-red-500/10', text: 'text-red-500' };
      default:
        return { bg: 'bg-slate-500/10', text: 'text-slate-500' };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <TypeIcon className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <p className="font-medium text-sm text-slate-900 dark:text-white">{document.name}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{document.type?.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
          {document.status?.replace(/_/g, ' ')}
        </span>
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(document)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Document list with viewer
interface DocumentListProps {
  documents: DocumentData[];
  emptyMessage?: string;
}

export function DocumentList({ documents, emptyMessage = 'No documents' }: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
        <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <DocumentCard
            key={getDocId(doc)}
            document={doc}
            onView={setSelectedDoc}
          />
        ))}
      </div>

      {selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </>
  );
}

// Helper to format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
