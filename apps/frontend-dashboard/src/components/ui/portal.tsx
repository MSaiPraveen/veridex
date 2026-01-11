'use client';

import { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal Component
 * 
 * Renders children into document.body to escape stacking contexts.
 * Use this for all overlays: dropdowns, modals, notifications, tooltips.
 */
interface PortalProps {
  children: React.ReactNode;
  show: boolean;
  onClickOutside?: () => void;
}

export function Portal({ children, show, onClickOutside }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!show || !onClickOutside) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClickOutside();
      }
    };

    // Delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [show, onClickOutside]);

  // Handle escape key
  useEffect(() => {
    if (!show || !onClickOutside) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClickOutside();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onClickOutside]);

  if (!mounted || !show) return null;

  return createPortal(
    <div ref={containerRef}>{children}</div>,
    document.body
  );
}

/**
 * Positioned Portal
 * 
 * A portal that positions itself relative to an anchor element.
 * Useful for dropdowns, popovers, and tooltips.
 */
interface PositionedPortalProps extends PortalProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';
  offset?: { x?: number; y?: number };
  className?: string;
}

export function PositionedPortal({
  children,
  show,
  onClickOutside,
  anchorRef,
  position = 'bottom-right',
  offset = { x: 0, y: 8 },
  className = '',
}: PositionedPortalProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });

  // Calculate position
  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const offsetX = offset.x || 0;
    const offsetY = offset.y || 8;

    switch (position) {
      case 'bottom-right':
        setCoords({
          top: rect.bottom + offsetY,
          left: 0,
          right: window.innerWidth - rect.right + offsetX,
        });
        break;
      case 'bottom-left':
        setCoords({
          top: rect.bottom + offsetY,
          left: rect.left + offsetX,
          right: 0,
        });
        break;
      case 'bottom-center':
        setCoords({
          top: rect.bottom + offsetY,
          left: rect.left + rect.width / 2 + offsetX,
          right: 0,
        });
        break;
      case 'top-right':
        setCoords({
          top: rect.top - offsetY,
          left: 0,
          right: window.innerWidth - rect.right + offsetX,
        });
        break;
      case 'top-left':
        setCoords({
          top: rect.top - offsetY,
          left: rect.left + offsetX,
          right: 0,
        });
        break;
    }
  }, [anchorRef, position, offset]);

  useEffect(() => {
    if (show) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [show, updatePosition]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: coords.top,
    ...(coords.right ? { right: coords.right } : { left: coords.left }),
  };

  return (
    <Portal show={show} onClickOutside={onClickOutside}>
      <div style={style} className={className}>
        {children}
      </div>
    </Portal>
  );
}

/**
 * Modal Backdrop
 * 
 * Full-screen overlay for modals. Locks scroll when visible.
 */
interface ModalBackdropProps {
  show: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ModalBackdrop({ show, onClose, children, className = '' }: ModalBackdropProps) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (show) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [show]);

  return (
    <Portal show={show}>
      <div
        className="overlay-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`portal-modal ${className}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </Portal>
  );
}

/**
 * Toast Notification System
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op function if outside provider (for API client)
    return { showToast: () => { } };
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const bgColor = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }[toast.type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] animate-slide-in`}
      role="alert"
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
