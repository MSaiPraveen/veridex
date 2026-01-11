'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'admin-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyThemeToDOM(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

// Script to prevent flash of wrong theme
export const themeScript = `
  (function() {
    try {
      const stored = localStorage.getItem('${THEME_KEY}');
      const theme = stored || 'dark';
      const resolved = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      
      // Apply theme before React hydrates
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
      document.documentElement.style.colorScheme = resolved;
      
      // Prevent flash by making content visible after theme is set
      document.documentElement.style.visibility = 'visible';
    } catch (e) {
      // Fallback to dark theme if localStorage fails
      document.documentElement.classList.add('dark');
      document.documentElement.style.visibility = 'visible';
    }
  })();
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    // Get stored theme or default to 'dark'
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme = stored || 'dark';
    const resolved = resolveTheme(initialTheme);
    
    setThemeState(initialTheme);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
    
    // Mark as mounted - enables rendering
    setMounted(true);
  }, []);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolved);
      applyThemeToDOM(newResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    const resolved = resolveTheme(newTheme);
    setThemeState(newTheme);
    setResolvedTheme(resolved);
    localStorage.setItem(THEME_KEY, newTheme);
    applyThemeToDOM(resolved);
    
    // Dispatch custom event for theme change listeners
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: newTheme, resolved } }));
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    mounted,
  }), [theme, resolvedTheme, setTheme, toggleTheme, mounted]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
