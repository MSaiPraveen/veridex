'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { Document, getDocumentContentUrl, getDocumentDownloadUrl } from '@/lib/hooks';
import { getAccessToken } from '@/lib/api';

interface DocumentViewerProps {
  document: Document;
  onClose?: () => void;
}

/**
 * DocumentViewer component that fetches documents with proper authentication
 * Uses Blob URLs to display documents in iframes/img tags since they can't send auth headers
 */
export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const contentUrl = getDocumentContentUrl(document._id);
  const downloadUrl = getDocumentDownloadUrl(document._id);

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType?.startsWith('image/');

  // Fetch document with authentication and create blob URL
  useEffect(() => {
    let mounted = true;
    
    async function fetchDocument() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get auth token using the proper function from api.ts
        const token = getAccessToken();
        
        if (!token) {
          throw new Error('Not authenticated. Please log in again.');
        }
        
        const response = await fetch(contentUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
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
    
    // Cleanup blob URL on unmount
    return () => {
      mounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document._id, contentUrl]);

  const handleLoad = () => {
    // Already set loading to false when blob is created
  };

  const handleError = () => {
    setError('Failed to display document');
  };
  
  // Download handler with authentication
  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      // Get auth token using the proper function from api.ts
      const token = getAccessToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and click it
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName || document.name;
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
      <div className="bg-card rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icons.fileText className="text-primary" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{document.name}</h3>
              <p className="text-sm text-muted-foreground">
                {document.type?.replace(/_/g, ' ')} • {formatFileSize(document.fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center"
              title="Download document"
            >
              <Icons.download size={16} className="mr-1.5" />
              Download
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Close"
              >
                <Icons.x size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-muted/30 min-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Icons.alertCircle className="text-destructive mb-4" size={48} />
              <p className="text-destructive font-medium">{error}</p>
              <button
                onClick={handleDownload}
                className="btn-primary mt-4"
              >
                Download Instead
              </button>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <Icons.fileText className="text-muted-foreground mb-4" size={64} />
              <p className="text-muted-foreground mb-2">
                Preview not available for this file type
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {document.mimeType}
              </p>
              <button
                onClick={handleDownload}
                className="btn-primary"
              >
                <Icons.download size={16} className="mr-2" />
                Download to View
              </button>
            </div>
          )}
        </div>

        {/* Extracted Data Section */}
        {document.extractedData && Object.keys(document.extractedData).length > 0 && (
          <div className="border-t p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Icons.activity size={16} className="text-primary" />
              Extracted Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {'issuedTo' in document.extractedData && Boolean(document.extractedData.issuedTo) && (
                <div>
                  <span className="text-muted-foreground">Issued To:</span>
                  <p className="font-medium">{String(document.extractedData.issuedTo)}</p>
                </div>
              )}
              {'issuedBy' in document.extractedData && Boolean(document.extractedData.issuedBy) && (
                <div>
                  <span className="text-muted-foreground">Issued By:</span>
                  <p className="font-medium">{String(document.extractedData.issuedBy)}</p>
                </div>
              )}
              {'licenseNumber' in document.extractedData && Boolean(document.extractedData.licenseNumber) && (
                <div>
                  <span className="text-muted-foreground">License #:</span>
                  <p className="font-medium font-mono">{String(document.extractedData.licenseNumber)}</p>
                </div>
              )}
              {'validUntil' in document.extractedData && Boolean(document.extractedData.validUntil) && (
                <div>
                  <span className="text-muted-foreground">Valid Until:</span>
                  <p className="font-medium">
                    {new Date(String(document.extractedData.validUntil)).toLocaleDateString()}
                  </p>
                </div>
              )}
              {'thcContent' in document.extractedData && document.extractedData.thcContent !== undefined && (
                <div>
                  <span className="text-muted-foreground">THC Content:</span>
                  <p className="font-medium">{String(document.extractedData.thcContent)}%</p>
                </div>
              )}
              {'cbdContent' in document.extractedData && document.extractedData.cbdContent !== undefined && (
                <div>
                  <span className="text-muted-foreground">CBD Content:</span>
                  <p className="font-medium">{String(document.extractedData.cbdContent)}%</p>
                </div>
              )}
              {'batchNumber' in document.extractedData && Boolean(document.extractedData.batchNumber) && (
                <div>
                  <span className="text-muted-foreground">Batch #:</span>
                  <p className="font-medium font-mono">{String(document.extractedData.batchNumber)}</p>
                </div>
              )}
              {'confidence' in document.extractedData && document.extractedData.confidence !== undefined && (
                <div>
                  <span className="text-muted-foreground">Confidence:</span>
                  <p className="font-medium">{Math.round(Number(document.extractedData.confidence) * 100)}%</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact document card with view button
interface DocumentCardProps {
  document: Document;
  onView?: (doc: Document) => void;
}

export function DocumentCard({ document, onView }: DocumentCardProps) {
  const isPdf = document.mimeType === 'application/pdf';

  // Get the icon component based on document type
  const TypeIcon = isPdf ? Icons.fileText : Icons.file;

  const getStatusBadge = () => {
    switch (document.status) {
      case 'SUCCESS':
        return 'badge-success';
      case 'PENDING':
      case 'PROCESSING':
        return 'badge-warning';
      case 'FAILED':
      case 'EXPIRED':
        return 'badge-error';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
          <TypeIcon size={18} />
        </div>
        <div>
          <p className="font-medium text-sm">{document.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{document.type?.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>{formatFileSize(document.fileSize)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge text-xs ${getStatusBadge()}`}>
          {document.status?.replace(/_/g, ' ')}
        </span>
        {onView && (
          <button
            onClick={() => onView(document)}
            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
            title="View document"
          >
            <Icons.eye size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Document list with viewer
interface DocumentListProps {
  documents: Document[];
  emptyMessage?: string;
}

export function DocumentList({ documents, emptyMessage = 'No documents' }: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg border-dashed">
        <Icons.fileText className="mx-auto text-muted-foreground mb-2" size={24} />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <DocumentCard
            key={doc._id}
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
