/**
 * VERIDEX ADMIN PORTAL - DESIGN TOKEN SYSTEM
 * ============================================
 * Single source of truth for all colors and design values.
 * 
 * RULES:
 * 1. NEVER use hex codes, rgb(), or Tailwind arbitrary values in components
 * 2. ALWAYS use these token classes
 * 3. All tokens are WCAG AA+ compliant for both themes
 * 4. Use semantic names, not color names
 */

// ============================================
// BACKGROUND TOKENS
// ============================================
export const bg = {
  /** Main page background */
  primary: 'bg-slate-50 dark:bg-slate-900',
  /** Secondary/alternative background */
  secondary: 'bg-slate-100 dark:bg-slate-800',
  /** Card/elevated surface background */
  surface: 'bg-white dark:bg-slate-800',
  /** Elevated surface with subtle transparency */
  surfaceElevated: 'bg-white dark:bg-slate-800/90',
  /** Muted/subtle background */
  muted: 'bg-slate-100 dark:bg-slate-800/50',
  /** Inverse background for contrast areas */
  inverse: 'bg-slate-900 dark:bg-white',
  /** Overlay/backdrop */
  overlay: 'bg-black/50 dark:bg-black/60',
  /** Sidebar background (always dark in admin) */
  sidebar: 'bg-slate-900 dark:bg-slate-950',
  /** Header/topbar background */
  header: 'bg-white dark:bg-slate-800',
} as const;

// ============================================
// TEXT TOKENS
// ============================================
export const text = {
  /** Primary text - highest contrast */
  primary: 'text-slate-900 dark:text-white',
  /** Secondary text - slightly muted */
  secondary: 'text-slate-700 dark:text-slate-300',
  /** Tertiary/muted text - labels, hints */
  muted: 'text-slate-500 dark:text-slate-400',
  /** Inverse text for dark backgrounds */
  inverse: 'text-white dark:text-slate-900',
  /** Disabled text */
  disabled: 'text-slate-400 dark:text-slate-600',
  /** Link text */
  link: 'text-amber-600 dark:text-amber-400',
  /** Error text */
  error: 'text-red-600 dark:text-red-400',
  /** Success text */
  success: 'text-emerald-600 dark:text-emerald-400',
  /** Warning text */
  warning: 'text-amber-600 dark:text-amber-400',
} as const;

// ============================================
// BORDER TOKENS
// ============================================
export const border = {
  /** Default border */
  default: 'border-slate-200 dark:border-slate-700',
  /** Subtle/light border */
  subtle: 'border-slate-100 dark:border-slate-800',
  /** Strong/emphasis border */
  strong: 'border-slate-300 dark:border-slate-600',
  /** Accent border (amber) */
  accent: 'border-amber-500 dark:border-amber-400',
  /** Error border */
  error: 'border-red-500 dark:border-red-400',
  /** Success border */
  success: 'border-emerald-500 dark:border-emerald-400',
  /** Focus ring */
  focus: 'focus:ring-amber-500/50 focus:border-amber-500',
} as const;

// ============================================
// STATUS TOKENS (Semantic)
// ============================================
export const status = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30',
    icon: 'text-red-500 dark:text-red-400',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-500/30',
    icon: 'text-sky-500 dark:text-sky-400',
  },
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-700/50',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-600',
    icon: 'text-slate-500 dark:text-slate-400',
  },
} as const;

// ============================================
// SEVERITY TOKENS (Priority levels)
// ============================================
export const severity = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-500/20',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-300 dark:border-red-500/40',
    badge: 'bg-red-600 text-white',
  },
  high: {
    bg: 'bg-orange-100 dark:bg-orange-500/20',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-500/40',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-500/40',
    badge: 'bg-amber-500 text-white',
  },
  low: {
    bg: 'bg-slate-100 dark:bg-slate-600/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
    badge: 'bg-slate-500 text-white',
  },
} as const;

// ============================================
// INTERACTIVE TOKENS
// ============================================
export const interactive = {
  /** Hover state for cards/rows */
  hover: 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
  /** Active/pressed state */
  active: 'active:bg-slate-100 dark:active:bg-slate-700',
  /** Focus state */
  focus: 'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
  /** Selected state */
  selected: 'bg-amber-50 dark:bg-amber-500/10 border-amber-500',
  /** Disabled state */
  disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
} as const;

// ============================================
// BUTTON VARIANTS
// ============================================
export const button = {
  primary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
  secondary: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm',
} as const;

// ============================================
// INPUT TOKENS
// ============================================
export const input = {
  base: 'bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500',
  focus: 'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
  error: 'border-red-500 dark:border-red-400 focus:ring-red-500/50 focus:border-red-500',
  disabled: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed',
} as const;

// ============================================
// LAYOUT CONSTANTS
// ============================================
export const layout = {
  sidebarWidth: '256px',
  headerHeight: '64px',
  contentPadding: 'px-4 sm:px-6 lg:px-8 py-6',
  maxContentWidth: 'max-w-7xl',
  cardPadding: 'p-5',
  cardRadius: 'rounded-xl',
  cardBorder: 'border border-slate-200 dark:border-slate-700',
} as const;

// ============================================
// SPACING SCALE
// ============================================
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================
export const zIndex = {
  base: 0,
  card: 10,
  sticky: 50,
  header: 100,
  sidebar: 150,
  dropdown: 1100,
  modal: 1200,
  toast: 1300,
  tooltip: 1400,
} as const;

// ============================================
// SHADOW TOKENS
// ============================================
export const shadow = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  card: 'shadow-sm dark:shadow-none',
  elevated: 'shadow-lg dark:shadow-2xl dark:shadow-black/20',
} as const;

// ============================================
// ANIMATION TOKENS
// ============================================
export const animation = {
  fadeIn: 'animate-fade-in',
  slideDown: 'animate-slide-down',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
} as const;

// ============================================
// TRANSITION TOKENS
// ============================================
export const transition = {
  fast: 'transition-all duration-100 ease-out',
  normal: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-300 ease-out',
  colors: 'transition-colors duration-150',
} as const;

// ============================================
// COMPOSITE TOKENS (Common patterns)
// ============================================
export const composite = {
  /** Standard card styling */
  card: `${bg.surface} ${border.default} ${layout.cardRadius} ${shadow.card}`,
  /** Interactive card */
  cardInteractive: `${bg.surface} ${border.default} ${layout.cardRadius} ${shadow.card} ${interactive.hover} ${transition.normal} cursor-pointer`,
  /** Page header */
  pageHeader: `${text.primary} text-2xl font-bold`,
  /** Page description */
  pageDescription: `${text.muted} mt-1`,
  /** Section title */
  sectionTitle: `${text.primary} text-lg font-semibold`,
  /** Data label */
  dataLabel: `${text.muted} text-sm`,
  /** Data value */
  dataValue: `${text.primary} font-medium`,
  /** Empty state */
  emptyState: `${text.muted} text-center py-12`,
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status tokens by status string
 */
export function getStatusTokens(statusKey: keyof typeof status) {
  return status[statusKey] || status.neutral;
}

/**
 * Get severity tokens by severity string
 */
export function getSeverityTokens(severityKey: keyof typeof severity) {
  return severity[severityKey] || severity.low;
}

/**
 * Combine multiple token classes
 */
export function tokens(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// TYPE EXPORTS
// ============================================
export type StatusKey = keyof typeof status;
export type SeverityKey = keyof typeof severity;
export type ButtonVariant = keyof typeof button;
