'use client';

import { ReactNode, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  footer,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      onClick={(e) => {
        if (closeOnOverlay && e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl
          animate-scale-in
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <div>
              {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// Confirmation Modal
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'success'} 
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  );
}

// Slide-over Panel (for details)
interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const slideOverWidths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function SlideOver({ isOpen, onClose, title, subtitle, children, width = 'md' }: SlideOverProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[1200] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="absolute inset-y-0 right-0 flex">
        <div 
          className={`
            w-screen ${slideOverWidths[width]}
            bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-2xl
            animate-slide-in-right
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <div>
              {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
              {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
