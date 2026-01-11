"use client";

import { useEffect, useCallback } from "react";
import { Icons } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full ${sizeClasses[size]} mx-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
          >
            <Icons.x size={20} className="text-[var(--foreground-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const btnText = confirmLabel || confirmText || "Confirm";
  const variantStyles = {
    danger: "bg-error-600 hover:bg-error-700 text-white",
    warning: "bg-warning-600 hover:bg-warning-700 text-white",
    info: "bg-primary-600 hover:bg-primary-700 text-white",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-[var(--foreground-muted)] mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`btn ${variantStyles[variant]} ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isLoading ? (
            <>
              <Icons.loader size={16} className="mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            btnText
          )}
        </button>
      </div>
    </Modal>
  );
}
