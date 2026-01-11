'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

// Input Component
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full px-3 py-2.5 rounded-lg
              bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        placeholder="Search..."
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg resize-none
            bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, children, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg appearance-none
            bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem'
          }}
          {...props}
        >
          {children || options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Checkbox Component
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          className="
            h-4 w-4 rounded border-slate-700 bg-slate-900/50 
            text-amber-500 focus:ring-amber-500/50 focus:ring-offset-slate-900
            transition-colors duration-150
          "
          {...props}
        />
        {label && <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
