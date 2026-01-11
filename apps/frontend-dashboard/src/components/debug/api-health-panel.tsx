'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, checkApiHealth, HealthStatus } from '@/lib/api';
import { Icons } from '@/components/ui/icons';

interface ServiceStatus {
  name: string;
  endpoint: string;
  status: 'checking' | 'ok' | 'error';
  latency?: number;
}

/**
 * API Health Panel - Development Tool
 * Shows connection status to API Gateway and service health
 * Only visible in development mode
 */
export function ApiHealthPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [gatewayHealth, setGatewayHealth] = useState<HealthStatus | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Auth', endpoint: '/auth/me', status: 'checking' },
    { name: 'Products', endpoint: '/products?limit=1', status: 'checking' },
    { name: 'Documents', endpoint: '/documents?limit=1', status: 'checking' },
    { name: 'Organizations', endpoint: '/organizations?limit=1', status: 'checking' },
  ]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Only show in development
  useEffect(() => {
     
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  const checkHealth = async () => {
    // Reset all services to checking
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const, latency: undefined })));

    // Check gateway health
    const health = await checkApiHealth();
    setGatewayHealth(health);

    // Check each service endpoint
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const start = performance.now();
        try {
          const response = await fetch(`${API_BASE_URL}${service.endpoint}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          const latency = Math.round(performance.now() - start);
          return {
            ...service,
            status: response.ok || response.status === 401 ? 'ok' as const : 'error' as const,
            latency,
          };
        } catch {
          return { ...service, status: 'error' as const };
        }
      })
    );

    setServices(updatedServices);
    setLastCheck(new Date());
  };

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-[var(--primary)] text-white shadow-lg hover:opacity-90 transition-opacity"
        title="API Health Panel"
      >
        <Icons.activity size={20} />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">API Health</h3>
            <button
              onClick={checkHealth}
              className="p-1 hover:bg-[var(--muted)] rounded"
              title="Refresh"
            >
              <Icons.refreshCw size={16} />
            </button>
          </div>

          {/* Gateway Status */}
          <div className="mb-4 p-2 bg-[var(--muted)] rounded">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">API Gateway</span>
              {gatewayHealth?.status === 'ok' ? (
                <Icons.checkCircle size={16} className="text-green-500" />
              ) : (
                <Icons.xCircle size={16} className="text-red-500" />
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 font-mono">
              {API_BASE_URL}
            </p>
          </div>

          {/* Service Status */}
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-1">
                <span className="text-sm">{service.name}</span>
                <div className="flex items-center gap-2">
                  {service.latency && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {service.latency}ms
                    </span>
                  )}
                  {service.status === 'checking' ? (
                    <span className="animate-spin"><Icons.refreshCw size={16} className="text-[var(--muted-foreground)]" /></span>
                  ) : service.status === 'ok' ? (
                    <Icons.checkCircle size={16} className="text-green-500" />
                  ) : (
                    <Icons.xCircle size={16} className="text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Last Check */}
          {lastCheck && (
            <p className="text-xs text-[var(--muted-foreground)] mt-4 text-center">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </>
  );
}
