'use client';

import { ReactNode, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const tooltipOffset = 8;

        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = rect.top - tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + tooltipOffset;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - tooltipOffset;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + tooltipOffset;
            break;
        }

        setCoords({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && typeof window !== 'undefined' && createPortal(
        <div
          className={`
            fixed z-[1400] px-2 py-1.5 text-xs font-medium
            bg-slate-900 text-slate-200 rounded-md shadow-lg
            border border-slate-700
            animate-fade-in
            ${positionClasses[position]}
          `}
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
