"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input w-full ${error ? "border-error-500 focus:ring-error-500" : ""} ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--foreground-muted)]">{hint}</p>
        )}
        {error && <p className="text-xs text-error-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`input w-full min-h-[100px] resize-y ${
            error ? "border-error-500 focus:ring-error-500" : ""
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-[var(--foreground-muted)]">{hint}</p>
        )}
        {error && <p className="text-xs text-error-500">{error}</p>}
      </div>
    );
  }
);
TextArea.displayName = "TextArea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, options, placeholder, className = "", id, ...props },
    ref
  ) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={`input w-full ${
            error ? "border-error-500 focus:ring-error-500" : ""
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p className="text-xs text-[var(--foreground-muted)]">{hint}</p>
        )}
        {error && <p className="text-xs text-error-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = "", id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={`mt-1 h-4 w-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500 ${className}`}
          {...props}
        />
        <div>
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--foreground)] cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="text-xs text-[var(--foreground-muted)]">
              {description}
            </p>
          )}
          {error && <p className="text-xs text-error-500 mt-1">{error}</p>}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function FormField({ children, className = "" }: FormFieldProps) {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
}

interface FormRowProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export function FormRow({ children, cols = 2 }: FormRowProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };
  return <div className={`grid ${gridCols[cols]} gap-4`}>{children}</div>;
}

interface FormActionsProps {
  children?: React.ReactNode;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
}

export function FormActions({ 
  children, 
  onCancel, 
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  isSubmitting = false,
}: FormActionsProps) {
  // If children are provided, render them
  if (children) {
    return (
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        {children}
      </div>
    );
  }

  // Otherwise, render standard form buttons
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
      {onCancel && (
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
          {cancelLabel}
        </button>
      )}
      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Processing..." : submitLabel}
      </button>
    </div>
  );
}
