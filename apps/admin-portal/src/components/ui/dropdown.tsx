'use client';

import { ReactNode, useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// Dropdown Manager Context - ensures only one dropdown is open at a time
interface DropdownManagerContextType {
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
}

const DropdownManagerContext = createContext<DropdownManagerContextType | null>(null);

export function DropdownManager({ children }: { children: ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <DropdownManagerContext.Provider value={{ activeDropdown, setActiveDropdown }}>
      {children}
    </DropdownManagerContext.Provider>
  );
}

function useDropdownManager() {
  return useContext(DropdownManagerContext);
}

// Dropdown Component
interface DropdownProps {
  id?: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right' | 'end';
  className?: string;
}

export function Dropdown({ id, trigger, children, align = 'right', className = '' }: DropdownProps) {
  const manager = useDropdownManager();
  const [internalOpen, setInternalOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownId = id || `dropdown-${Math.random().toString(36).substr(2, 9)}`;

  // Use manager if available, otherwise internal state
  const isOpen = manager ? manager.activeDropdown === dropdownId : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (manager) {
      manager.setActiveDropdown(open ? dropdownId : null);
    } else {
      setInternalOpen(open);
    }
  };

  const toggle = () => setIsOpen(!isOpen);
  const close = useCallback(() => setIsOpen(false), []);

  // Calculate position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: align === 'right' || align === 'end' ? rect.right : rect.left,
        width: rect.width,
      });
    }
  }, [isOpen, align]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => close();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, close]);

  return (
    <>
      <div ref={triggerRef} onClick={toggle} className="inline-block">
        {trigger}
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`
            fixed z-[1100] min-w-[200px]
            bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl
            animate-scale-in origin-top-right
            ${className}
          `}
          style={{
            top: position.top,
            ...((align === 'right' || align === 'end')
              ? { right: window.innerWidth - position.left }
              : { left: position.left }
            ),
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

// Dropdown Item
interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  danger?: boolean;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function DropdownItem({ children, onClick, icon, danger, variant, disabled }: DropdownItemProps) {
  const isDanger = danger || variant === 'danger';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
        transition-colors duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isDanger 
          ? 'text-red-500 dark:text-red-400 hover:bg-red-500/10' 
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
        }
      `}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}

// Dropdown Divider
export function DropdownDivider() {
  return <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />;
}

// Dropdown Header
export function DropdownHeader({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 mb-1">
      {children}
    </div>
  );
}

// Popover (for more complex content like notifications)
interface PopoverProps {
  id?: string;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right' | 'center' | 'end';
  width?: number;
  className?: string;
}

export function Popover({ id, trigger, children, align = 'right', width = 320, className = '' }: PopoverProps) {
  const manager = useDropdownManager();
  const [internalOpen, setInternalOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, triggerWidth: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = id || `popover-${Math.random().toString(36).substr(2, 9)}`;

  const isOpen = manager ? manager.activeDropdown === popoverId : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (manager) {
      manager.setActiveDropdown(open ? popoverId : null);
    } else {
      setInternalOpen(open);
    }
  };

  const toggle = () => setIsOpen(!isOpen);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
        triggerWidth: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, close]);

  const getLeftPosition = () => {
    if (align === 'left') return position.left - position.triggerWidth / 2;
    if (align === 'right' || align === 'end') return position.left - width + position.triggerWidth / 2;
    return position.left - width / 2;
  };

  return (
    <>
      <div ref={triggerRef} onClick={toggle} className="inline-block">
        {trigger}
      </div>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className={`fixed z-[1100] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl animate-scale-in ${className}`}
          style={{
            top: position.top,
            left: Math.max(16, Math.min(getLeftPosition(), window.innerWidth - width - 16)),
            width,
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
